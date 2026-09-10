import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './useNavigationItems';

describe('GooseMED navigation items', () => {
  it('exposes the controlled MCP settings page', () => {
    expect(NAV_ITEMS).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'extensions', path: '/extensions' })])
    );
  });
});
