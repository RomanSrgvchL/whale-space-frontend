export const IN_PRODUCTION = false;
export const HEARTBEAT_OUTGOING = 10_000
export const HEARTBEAT_INCOMING = 10_000
export const RECONNECT_DELAY = 3_000

export const PRELOAD_AVATAR = '/avatars/preload.jpg'
export const DEFAULT_AVATAR = '/avatars/default.jpg'

export const ROLE_ADMIN = 'ROLE_ADMIN'

const DEV_CONFIG = {
    protocol: 'http',
    domain: 'localhost',
    port: '8080',
    prefix: 'api/v1',
};

const PROD_CONFIG = {
    protocol: 'http',
    domain: 'localhost',
    port: '8080',
    prefix: 'api/v1',
};

const { protocol, domain, port, prefix } = IN_PRODUCTION ? PROD_CONFIG : DEV_CONFIG;

export const API_BASE_URL = `${protocol}://${domain}:${port}/${prefix}`;
