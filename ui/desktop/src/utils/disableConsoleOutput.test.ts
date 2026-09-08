import { describe, expect, it, vi } from 'vitest';
import { disableConsoleOutput } from './disableConsoleOutput';

describe('disableConsoleOutput', () => {
  it('discards the console methods used by the desktop application', () => {
    const originalMethods = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };
    const consoleOutput = { ...originalMethods };

    disableConsoleOutput(consoleOutput);

    for (const method of Object.values(consoleOutput)) {
      method('patient-data-must-not-be-emitted');
    }
    for (const method of Object.values(originalMethods)) {
      expect(method).not.toHaveBeenCalled();
    }
  });
});
