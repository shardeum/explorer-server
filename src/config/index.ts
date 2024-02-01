export const envEnum = {
  DEV: 'development',
  PROD: 'production',
}

export const config = {
  env: process.env.NODE_ENV || envEnum.DEV, //default to safe if no env is set
  host: process.env.HOST || '127.0.0.1',
  subscription: {
    enabled: false,
  },
  collectorInfo: {
    publicKey:
      process.env.COLLECTOR_PUBLIC_KEY || '9426b64e675cad739d69526bf7e27f3f304a8a03dca508a9180f01e9269ce447',
    secretKey:
      process.env.COLLECTOR_SECRET_KEY ||
      '7d8819b6fac8ba2fbac7363aaeb5c517e52e615f95e1a161d635521d5e4969739426b64e675cad739d69526bf7e27f3f304a8a03dca508a9180f01e9269ce447',
  },
  hashKey: '69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc',
  port: {
    collector: process.env.COLLECTORPORT || '4444',
    server: process.env.PORT || '6001',
    rpc_data_collector: process.env.RPCDCPORT || '4445',
    log_server: process.env.LOG_SERVER_PORT || '4446',
  },
  distributorInfo: {
    ip: process.env.DISTRIBUTOR_IP || '127.0.0.1',
    port: process.env.DISTRIBUTOR_PORT || '6100',
    publicKey:
      process.env.DISTRIBUTOR_PUBLIC_KEY ||
      '758b1c119412298802cd28dbfa394cdfeecc4074492d60844cc192d632d84de3',
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
  enableTxHashCache: true,
  findTxHashInOriginalTx: true,
  indexData: {
    indexReceipt: true,
    indexOriginalTxData: true,
    decodeContractInfo: true,
    decodeTokenTransfer: true,
  },
  DISTRIBUTOR_RECONNECT_INTERVAL: 10_000, // in ms
  CONNECT_TO_DISTRIBUTOR_MAX_RETRY: 10,
}

export const DISTRIBUTOR_URL = `http://${config.distributorInfo.ip}:${config.distributorInfo.port}`
