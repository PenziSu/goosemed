use crate::agents::ExtensionConfig;

pub const FIXED_PROVIDER: &str = "openai";
pub const FIXED_MODEL: &str = "gpt-oss-120b";
pub const FIXED_MCP_NAME: &str = "goosemed_irb_mcp";
pub const LLM_ENDPOINT: &str = "http://172.22.135.127:8000/v1";
pub const MCP_ENDPOINT: &str = match option_env!("GOOSEMED_MCP_ENDPOINT") {
    Some(value) => value,
    None => "http://127.0.0.1:3001/mcp",
};

pub fn fixed_extensions() -> Vec<ExtensionConfig> {
    vec![
        ExtensionConfig::Platform {
            name: "developer".to_string(),
            description: "Write and edit files, and execute shell commands".to_string(),
            display_name: Some("Developer".to_string()),
            bundled: Some(true),
            available_tools: Vec::new(),
        },
        ExtensionConfig::StreamableHttp {
            name: FIXED_MCP_NAME.to_string(),
            description: "GooseMed controlled IRB data intermediary".to_string(),
            uri: MCP_ENDPOINT.to_string(),
            envs: Default::default(),
            env_keys: Vec::new(),
            headers: Default::default(),
            timeout: Some(crate::config::DEFAULT_EXTENSION_TIMEOUT),
            socket: None,
            client_id: None,
            client_secret_key: None,
            scopes: Vec::new(),
            bundled: Some(true),
            available_tools: Vec::new(),
        },
    ]
}

pub fn extension_is_allowed(config: &ExtensionConfig) -> bool {
    fixed_extensions().iter().any(|allowed| allowed == config)
}

pub fn ensure_provider(provider: &str) -> anyhow::Result<()> {
    if provider == FIXED_PROVIDER {
        Ok(())
    } else {
        anyhow::bail!("GooseMed only permits the '{}' provider", FIXED_PROVIDER)
    }
}

pub fn ensure_model(model: &str) -> anyhow::Result<()> {
    if model == FIXED_MODEL {
        Ok(())
    } else {
        anyhow::bail!("GooseMed only permits the '{}' model", FIXED_MODEL)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn policy_has_one_fixed_provider_and_model() {
        assert!(ensure_provider(FIXED_PROVIDER).is_ok());
        assert!(ensure_model(FIXED_MODEL).is_ok());
        assert!(ensure_provider("anthropic").is_err());
        assert!(ensure_model("gpt-4o").is_err());
        assert_eq!(LLM_ENDPOINT, "http://172.22.135.127:8000/v1");
    }

    #[test]
    fn policy_rejects_unapproved_extensions() {
        let stdio = ExtensionConfig::stdio("untrusted", "python", "", 30_u64);
        let other_mcp =
            ExtensionConfig::streamable_http("other", "https://outside.example/mcp", "", 30_u64);

        assert!(!extension_is_allowed(&stdio));
        assert!(!extension_is_allowed(&other_mcp));
        assert!(fixed_extensions().iter().all(extension_is_allowed));
    }
}
