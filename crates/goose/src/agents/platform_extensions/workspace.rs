use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Clone, Copy)]
pub(crate) enum PathRequirement {
    Existing,
    AllowMissing,
}

pub(crate) fn resolve_workspace_path(
    path: &str,
    working_dir: Option<&Path>,
    requirement: PathRequirement,
) -> Result<PathBuf, String> {
    let working_dir = working_dir.ok_or_else(|| "working directory is required".to_string())?;
    let relative = Path::new(path);

    for component in relative.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            Component::ParentDir => {
                return Err("parent directory paths are not allowed".to_string())
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err("absolute paths are not allowed".to_string())
            }
        }
    }

    let root = working_dir
        .canonicalize()
        .map_err(|error| format!("failed to resolve working directory: {error}"))?;
    if !root.is_dir() {
        return Err("working directory is not a directory".to_string());
    }

    let candidate = root.join(relative);
    let resolved = match requirement {
        PathRequirement::Existing => candidate
            .canonicalize()
            .map_err(|error| format!("failed to resolve path: {error}"))?,
        PathRequirement::AllowMissing => resolve_create_target(&candidate)?,
    };

    if !resolved.starts_with(&root) {
        return Err("path escapes the working directory".to_string());
    }

    Ok(resolved)
}

fn resolve_create_target(candidate: &Path) -> Result<PathBuf, String> {
    let mut existing = candidate;
    while fs::symlink_metadata(existing).is_err() {
        existing = existing
            .parent()
            .ok_or_else(|| "failed to find an existing parent directory".to_string())?;
    }

    let canonical_existing = existing
        .canonicalize()
        .map_err(|error| format!("failed to resolve path: {error}"))?;
    let suffix = candidate
        .strip_prefix(existing)
        .map_err(|_| "failed to resolve path inside working directory".to_string())?;

    if suffix.as_os_str().is_empty() {
        Ok(canonical_existing)
    } else {
        Ok(canonical_existing.join(suffix))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_relative_existing_and_new_paths() {
        let temp = tempfile::tempdir().unwrap();
        fs::write(temp.path().join("input.txt"), "data").unwrap();

        let existing =
            resolve_workspace_path("input.txt", Some(temp.path()), PathRequirement::Existing)
                .unwrap();
        let new = resolve_workspace_path(
            "nested/output.txt",
            Some(temp.path()),
            PathRequirement::AllowMissing,
        )
        .unwrap();

        assert_eq!(
            existing,
            temp.path().canonicalize().unwrap().join("input.txt")
        );
        assert_eq!(
            new,
            temp.path()
                .canonicalize()
                .unwrap()
                .join("nested/output.txt")
        );
    }

    #[test]
    fn rejects_missing_root_absolute_and_parent_paths() {
        let temp = tempfile::tempdir().unwrap();

        assert!(resolve_workspace_path("file.txt", None, PathRequirement::AllowMissing).is_err());
        assert!(resolve_workspace_path(
            &temp.path().join("file.txt").display().to_string(),
            Some(temp.path()),
            PathRequirement::AllowMissing,
        )
        .is_err());
        assert!(resolve_workspace_path(
            "../file.txt",
            Some(temp.path()),
            PathRequirement::AllowMissing,
        )
        .is_err());
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlinks_that_escape_for_reads_and_writes() {
        use std::os::unix::fs::symlink;

        let workspace = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("patient.txt"), "sensitive").unwrap();
        symlink(outside.path(), workspace.path().join("outside")).unwrap();

        assert!(resolve_workspace_path(
            "outside/patient.txt",
            Some(workspace.path()),
            PathRequirement::Existing,
        )
        .is_err());
        assert!(resolve_workspace_path(
            "outside/export.txt",
            Some(workspace.path()),
            PathRequirement::AllowMissing,
        )
        .is_err());
    }
}
