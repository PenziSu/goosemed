import type { Session } from 'electron';

type ProxySession = Pick<Session, 'setProxy'>;

export async function configureProxy(
  defaultSession: ProxySession,
  rendererSession: ProxySession
): Promise<void> {
  const proxyConfig = { mode: 'direct' as const };

  await Promise.all([defaultSession.setProxy(proxyConfig), rendererSession.setProxy(proxyConfig)]);
}
