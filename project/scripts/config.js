const IN_PRODUCTION = false;

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
