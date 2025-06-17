const IN_PRODUCTION = false;
const HEARTBEAT_OUTGOING = 10_000
const HEARTBEAT_INCOMING = 10_000

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

const API_BASE_URL = `${protocol}://${domain}:${port}/${prefix}`;
