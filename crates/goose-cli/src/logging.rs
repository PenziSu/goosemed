use anyhow::Result;
use std::sync::OnceLock;

// Used to ensure we only set up tracing once
static INIT: OnceLock<Result<()>> = OnceLock::new();

/// Installs a sink subscriber so tracing data is not persisted or exported.
pub fn setup_logging(_name: Option<&str>) -> &'static Result<()> {
    INIT.get_or_init(|| {
        use tracing_subscriber::util::SubscriberInitExt;

        tracing_subscriber::registry()
            .try_init()
            .map_err(|e| anyhow::anyhow!("Failed to set global subscriber: {}", e))?;
        Ok(())
    })
}
