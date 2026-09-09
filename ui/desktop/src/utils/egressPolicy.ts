const NETWORK_PROTOCOLS = new Set(['http:', 'https:', 'ws:', 'wss:']);

function addHttpAndWebSocketOrigins(origins: Set<string>, rawUrl?: string | null): void {
  if (!rawUrl) return;

  try {
    const url = new URL(rawUrl);
    if (!NETWORK_PROTOCOLS.has(url.protocol)) return;

    origins.add(url.origin);
    url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
    origins.add(url.origin);
  } catch {
    return;
  }
}

export function isAllowedRendererNetworkUrl(
  rawUrl: string,
  appUrl: URL,
  backendUrl?: string | null
): boolean {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!NETWORK_PROTOCOLS.has(target.protocol)) return false;
  if (target.hostname === '127.0.0.1' || target.hostname === '[::1]') return true;

  const allowedOrigins = new Set<string>();
  addHttpAndWebSocketOrigins(allowedOrigins, appUrl.toString());
  addHttpAndWebSocketOrigins(allowedOrigins, backendUrl);
  return allowedOrigins.has(target.origin);
}
