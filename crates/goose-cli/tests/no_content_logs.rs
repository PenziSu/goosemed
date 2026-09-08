use std::{fs, process::Command};

#[test]
fn version_does_not_create_files_in_goose_data_root() {
    let data_root = tempfile::tempdir().expect("create temporary Goose data root");

    let output = Command::new(env!("CARGO_BIN_EXE_goose"))
        .arg("--version")
        .env("GOOSE_PATH_ROOT", data_root.path())
        .output()
        .expect("run goose --version");

    assert!(
        output.status.success(),
        "goose --version failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let created_paths = fs::read_dir(data_root.path())
        .expect("read temporary Goose data root")
        .map(|entry| entry.expect("read created path").path())
        .collect::<Vec<_>>();

    assert!(
        created_paths.is_empty(),
        "goose --version created unexpected files: {created_paths:?}"
    );
}
