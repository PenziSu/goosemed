import identity from '../app-identity.json';

export const APP_NAME = identity.productName;
export const APP_BUNDLE_ID = identity.bundleId;
export const DEEP_LINK_SCHEME = identity.protocolScheme;
export const DEEP_LINK_PREFIX = `${DEEP_LINK_SCHEME}://`;
export const RECIPE_DEEP_LINK_PREFIX = `${DEEP_LINK_PREFIX}recipe?config=`;
export const PERSISTENT_SESSION_PARTITION = identity.sessionPartition;
