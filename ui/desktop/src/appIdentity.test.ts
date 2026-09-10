import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APP_BUNDLE_ID,
  APP_NAME,
  DEEP_LINK_PREFIX,
  DEEP_LINK_SCHEME,
  PERSISTENT_SESSION_PARTITION,
} from './appIdentity';

describe('GooseMED application identity', () => {
  it('uses identifiers that do not collide with upstream Goose', () => {
    expect(APP_NAME).toBe('GooseMED');
    expect(APP_BUNDLE_ID).toBe('io.github.penzisu.goosemed');
    expect(DEEP_LINK_SCHEME).toBe('goosemed');
    expect(DEEP_LINK_PREFIX).toBe('goosemed://');
    expect(PERSISTENT_SESSION_PARTITION).toBe('persist:goosemed');
  });

  it('keeps the package name and backend storage isolated', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8')) as {
      productName: string;
    };
    const mainSource = fs.readFileSync(path.resolve('src/main.ts'), 'utf8');

    expect(packageJson.productName).toBe(APP_NAME);
    expect(mainSource).toContain("GOOSE_PATH_ROOT: path.join(app.getPath('userData'), 'backend')");
  });
});
