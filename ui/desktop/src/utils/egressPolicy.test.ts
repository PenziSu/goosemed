import { describe, expect, it } from 'vitest';
import { isAllowedRendererNetworkUrl } from './egressPolicy';

const appUrl = new URL('file:///Applications/GooseMed/index.html');

describe('renderer egress policy', () => {
  it.each([
    'https://127.0.0.1:4444/status',
    'wss://127.0.0.1:4444/acp',
    'http://[::1]:4444/mcp-app-guest',
  ])('allows loopback backend traffic: %s', (url) => {
    expect(isAllowedRendererNetworkUrl(url, appUrl)).toBe(true);
  });

  it('allows only the configured external backend origin', () => {
    const backend = 'https://his-gateway.hospital.example:8443/acp';

    expect(
      isAllowedRendererNetworkUrl(
        'wss://his-gateway.hospital.example:8443/acp',
        appUrl,
        backend
      )
    ).toBe(true);
    expect(
      isAllowedRendererNetworkUrl(
        'https://his-gateway.hospital.example:8443/status',
        appUrl,
        backend
      )
    ).toBe(true);
    expect(
      isAllowedRendererNetworkUrl(
        'https://other.hospital.example:8443/',
        appUrl,
        backend
      )
    ).toBe(false);
  });

  it('allows the exact development renderer origin', () => {
    const devApp = new URL('http://localhost:5173/');

    expect(isAllowedRendererNetworkUrl('http://localhost:5173/assets/app.js', devApp)).toBe(true);
    expect(isAllowedRendererNetworkUrl('http://localhost:5174/collect', devApp)).toBe(false);
  });

  it.each([
    'https://example.com/collect',
    'http://192.168.1.20/collect',
    'wss://attacker.example/socket',
    'not a URL',
  ])('blocks non-approved traffic: %s', (url) => {
    expect(isAllowedRendererNetworkUrl(url, appUrl)).toBe(false);
  });
});
