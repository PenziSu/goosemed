import { describe, expect, it } from 'vitest';
import { openExternalUrl } from './openExternalUrl';

describe('openExternalUrl', () => {
  it.each([
    'https://example.com/docs',
    'http://intranet.example/docs',
    'file:///tmp/secret',
    'javascript:alert(1)',
    'custom-handler:resource',
    'not a URL',
  ])(
    'blocks external URL %s',
    async (url) => {
      await expect(openExternalUrl(url)).resolves.toBe('blocked');
    }
  );
});
