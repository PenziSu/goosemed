import { describe, expect, it, vi } from 'vitest';
import { createNavigationHandler } from './navigationUtils';

describe('GooseMED navigation handler', () => {
  it('opens the controlled MCP settings route', () => {
    const navigate = vi.fn();
    const options = { showEnvVars: true };

    createNavigationHandler(navigate)('extensions', options);

    expect(navigate).toHaveBeenCalledWith('/extensions', { state: options });
  });
});
