import type { Session } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { configureProxy } from './proxy';

function createMockSession() {
  const setProxy = vi.fn<Session['setProxy']>().mockResolvedValue(undefined);
  return {
    session: { setProxy } as Pick<Session, 'setProxy'>,
    setProxy,
  };
}

describe('proxy configuration', () => {
  it('forces direct connections for both Electron sessions', async () => {
    const defaultSession = createMockSession();
    const rendererSession = createMockSession();

    await configureProxy(defaultSession.session, rendererSession.session);

    expect(defaultSession.setProxy).toHaveBeenCalledOnce();
    expect(rendererSession.setProxy).toHaveBeenCalledOnce();
    expect(defaultSession.setProxy).toHaveBeenCalledWith({ mode: 'direct' });
    expect(rendererSession.setProxy.mock.calls[0][0]).toBe(
      defaultSession.setProxy.mock.calls[0][0]
    );
  });
});
