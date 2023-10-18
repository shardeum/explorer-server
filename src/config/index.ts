type Config = {
  env: string
  subscription: {
    enabled: boolean
  }
  collector: {
    port: number
    host: string
  }
  log_server: {
    port: number
    host: string
  }
  server: {
    port: number
    host: string
  }
  archiverInfo: {
    ip: string
    port: number
    publicKey: string
  }
  rpcUrl: string
  apiUrl: string
  dbPath: string
  verbose: boolean
  genesisSHMSupply: number
  rateLimit: number
  patchData: boolean
  GTM_Id: string
  USAGE_ENDPOINTS_KEY: string
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development', // development, production
  subscription: {
    enabled: false,
  },
  collector: {
    port: Number(process.env.COLLECTOR_PORT) || 4444,
    host: process.env.COLLECTOR_HOST || '0.0.0.0',
  },
  log_server: {
    port: Number(process.env.LOG_SERVER_LISTEN_PORT) || 4446,
    host: process.env.LOG_SERVER_LISTEN_HOST || '0.0.0.0',
  },
  server: {
    port: Number(process.env.PORT) || 6001,
    host: process.env.HOST || '0.0.0.0',
  },
  archiverInfo: {
    ip: process.env.ARCHIVER_IP || '127.0.0.1',
    port: Number(process.env.ARCHIVER_PORT) || 4000,
    publicKey: process.env.ARCHIVER_PK || '758b1c119412298802cd28dbfa394cdfeecc4074492d60844cc192d632d84de3',
  },

  rpcUrl: process.env.RPC_URL || 'http://localhost:8080',
  apiUrl: '',
  dbPath: process.env.DB_PATH?.replace(/\/+$/, '') || '.', // remove trailing /
  verbose: false,
  genesisSHMSupply: 100000000,
  rateLimit: 100,
  patchData: false,
  GTM_Id: '',
  USAGE_ENDPOINTS_KEY: process.env.USAGE_ENDPOINTS_KEY || 'ceba96f6eafd2ea59e68a0b0d754a939',
}

export const ARCHIVER_INFO = `${config.archiverInfo.ip}:${config.archiverInfo.port}:${config.archiverInfo.publicKey}`
export const COLLECTOR_DISTRIBUTOR_URL = `http://${config.collector.host}:${config.collector.port}`
