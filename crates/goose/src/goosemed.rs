use crate::agents::ExtensionConfig;
use std::net::{IpAddr, SocketAddr};
use url::{Host, Url};

pub const FIXED_PROVIDER: &str = "openai";
pub const FIXED_MODEL: &str = "gpt-oss-120b";
pub const LLM_ENDPOINT: &str = "http://172.22.135.127:8000/v1";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ApprovedMcpEndpoint {
    pub host: String,
    pub addresses: Vec<SocketAddr>,
}

pub fn fixed_extensions() -> Vec<ExtensionConfig> {
    vec![ExtensionConfig::Platform {
        name: "developer".to_string(),
        description: "Write and edit files, and execute shell commands".to_string(),
        display_name: Some("Developer".to_string()),
        bundled: Some(true),
        available_tools: Vec::new(),
    }]
}

pub fn embedded_extension_is_allowed(config: &ExtensionConfig) -> bool {
    matches!(config, ExtensionConfig::Platform { name, .. } if name == "developer")
}

pub async fn ensure_extension_allowed(config: &ExtensionConfig) -> Result<(), String> {
    if !embedded_extension_is_allowed(config) && extension_uses_reserved_name(config) {
        return Err(format!(
            "extension name '{}' is reserved by GooseMED",
            config.name()
        ));
    }

    match config {
        ExtensionConfig::Platform { .. } if embedded_extension_is_allowed(config) => Ok(()),
        ExtensionConfig::StreamableHttp { uri, socket, .. } => {
            if socket.is_some() {
                return Err("GooseMED does not permit MCP Unix socket transports".to_string());
            }
            resolve_mcp_endpoint(uri).await.map(|_| ())
        }
        _ => Err(format!(
            "extension '{}' is not permitted; GooseMED only allows Developer and Streamable HTTP MCP servers in 172.22.0.0/16",
            config.name()
        )),
    }
}

pub fn extension_uses_reserved_name(config: &ExtensionConfig) -> bool {
    fixed_extensions()
        .iter()
        .any(|fixed| fixed.key() == config.key())
}

pub(crate) async fn resolve_mcp_endpoint(uri: &str) -> Result<ApprovedMcpEndpoint, String> {
    let url = Url::parse(uri).map_err(|error| format!("invalid MCP URL: {error}"))?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("MCP URL must use http or https".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("MCP URL must not contain embedded credentials".to_string());
    }

    let port = url
        .port_or_known_default()
        .ok_or_else(|| "MCP URL must include a valid port".to_string())?;
    let host = url
        .host()
        .ok_or_else(|| "MCP URL must include a host".to_string())?;

    let (host_name, addresses) = match host {
        Host::Ipv4(ip) => (ip.to_string(), vec![SocketAddr::new(IpAddr::V4(ip), port)]),
        Host::Ipv6(_) => {
            return Err("MCP URL must resolve only to IPv4 addresses in 172.22.0.0/16".to_string());
        }
        Host::Domain(domain) => {
            let mut addresses = tokio::net::lookup_host((domain, port))
                .await
                .map_err(|error| format!("MCP host DNS lookup failed: {error}"))?
                .collect::<Vec<_>>();
            addresses.sort_unstable();
            addresses.dedup();
            (domain.to_string(), addresses)
        }
    };

    validate_resolved_mcp_addresses(&addresses)?;
    Ok(ApprovedMcpEndpoint {
        host: host_name,
        addresses,
    })
}

fn validate_resolved_mcp_addresses(addresses: &[SocketAddr]) -> Result<(), String> {
    if addresses.is_empty() {
        return Err("MCP host DNS lookup returned no addresses".to_string());
    }
    if addresses
        .iter()
        .all(|address| is_approved_mcp_ip(address.ip()))
    {
        Ok(())
    } else {
        Err("MCP host must resolve only to 172.22.0.0/16 addresses".to_string())
    }
}

fn is_approved_mcp_ip(ip: IpAddr) -> bool {
    matches!(ip, IpAddr::V4(ip) if ip.octets()[0] == 172 && ip.octets()[1] == 22)
}

pub fn ensure_provider(provider: &str) -> anyhow::Result<()> {
    if provider == FIXED_PROVIDER {
        Ok(())
    } else {
        anyhow::bail!("GooseMED only permits the '{}' provider", FIXED_PROVIDER)
    }
}

pub fn ensure_model(model: &str) -> anyhow::Result<()> {
    if model == FIXED_MODEL {
        Ok(())
    } else {
        anyhow::bail!("GooseMED only permits the '{}' model", FIXED_MODEL)
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

    #[tokio::test]
    async fn policy_rejects_unapproved_extensions() {
        let stdio = ExtensionConfig::stdio("untrusted", "python", "", 30_u64);
        let reserved_name = ExtensionConfig::streamable_http(
            "Developer",
            "http://172.22.10.20:3001/mcp",
            "",
            30_u64,
        );
        let internal_mcp =
            ExtensionConfig::streamable_http("irb", "http://172.22.10.20:3001/mcp", "", 30_u64);
        let external_mcp =
            ExtensionConfig::streamable_http("other", "https://1.1.1.1/mcp", "", 30_u64);

        assert!(ensure_extension_allowed(&stdio).await.is_err());
        assert!(ensure_extension_allowed(&reserved_name).await.is_err());
        assert!(ensure_extension_allowed(&external_mcp).await.is_err());
        assert!(ensure_extension_allowed(&internal_mcp).await.is_ok());
        for extension in fixed_extensions() {
            assert!(ensure_extension_allowed(&extension).await.is_ok());
        }
    }

    #[test]
    fn dns_results_must_all_be_in_the_approved_subnet() {
        let approved = ["172.22.1.2:443".parse().unwrap()];
        let mixed = [
            "172.22.1.2:443".parse().unwrap(),
            "203.0.113.7:443".parse().unwrap(),
        ];
        let ipv6 = ["[::1]:443".parse().unwrap()];

        assert!(validate_resolved_mcp_addresses(&approved).is_ok());
        assert!(validate_resolved_mcp_addresses(&mixed).is_err());
        assert!(validate_resolved_mcp_addresses(&ipv6).is_err());
        assert!(validate_resolved_mcp_addresses(&[]).is_err());
    }

    #[tokio::test]
    async fn endpoint_rejects_unsafe_url_forms() {
        for uri in [
            "ftp://172.22.1.2/mcp",
            "http://user:password@172.22.1.2/mcp",
            "http://127.0.0.1:3001/mcp",
            "http://192.168.1.2:3001/mcp",
            "http://[::1]:3001/mcp",
        ] {
            assert!(resolve_mcp_endpoint(uri).await.is_err(), "accepted {uri}");
        }
    }
}
