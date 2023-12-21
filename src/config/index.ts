export const envEnum = {
  DEV: 'development',
  PROD: 'production',
}

export const config = {
  env: process.env.NODE_ENV || envEnum.PROD, //default to safe if no env is set
  host: process.env.HOST || '127.0.0.1',
  subscription: {
    enabled: false,
  },
  port: {
    collector: process.env.COLLECTORPORT || '4444',
    server: process.env.PORT || '6001',
    rpc_data_collector: process.env.RPCDCPORT || '4445',
    log_server: process.env.LOG_SERVER_PORT || '4446',
  },
  archiverInfo: {
    ip: process.env.ARCHIVERIP || '127.0.0.1',
    port: process.env.ARCHIVERPORT || '4000',
    publicKey: process.env.ARCHIVERPK || '758b1c119412298802cd28dbfa394cdfeecc4074492d60844cc192d632d84de3',
  },
  rpcUrl: process.env.RPC_URL || 'http://localhost:8080',
  apiUrl: '',
  verbose: false,
  genesisSHMSupply: 100000000,
  dbPath: process.env.DB_PATH?.replace(/\/+$/, '') || '.', // remove
  rateLimit: 100,
  patchData: false,
  GTM_Id: '',
  USAGE_ENDPOINTS_KEY: '',
}

export const ARCHIVER_INFO = `${config.archiverInfo.ip}:${config.archiverInfo.port}:${config.archiverInfo.publicKey}`
