export const config = {
  env: process.env.NODE_ENV || 'development', // development, production
  host: process.env.HOST || '127.0.0.1',
  subscription: {
    enabled: false,
  },
  port: {
    collector: process.env.COLLECTORPORT || '4444',
    server: process.env.PORT || '6001',
    rpc_data_collector: process.env.RPCDCPORT || '4445',
    distributor: process.env.DISTRIBUTOR_PORT || '4446',
    collector_distributor_sender: process.env.COLLECTOR_DISTRIBUTOR_SENDER_PORT || '4447',
  },
  archiverInfo: {
    ip: process.env.ARCHIVERIP || '127.0.0.1',
    port: process.env.ARCHIVERPORT || '4000',
    publicKey: process.env.ARCHIVERPK || '758b1c119412298802cd28dbfa394cdfeecc4074492d60844cc192d632d84de3',
  },
  rpcUrl: 'http://localhost:8080',
  apiUrl: '',
  EXPLORER_DB: 'explorer-db',
  TRANSACTION_DB: 'transaction-db',
  ACCOUNT_DB: 'account-db',
  CONTRACT_DB: 'contract-db',
  CYCLE_DB: 'cycle-db',
  verbose: false,
  experimentalSnapshot: true,
  genesisSHMSupply: 100000000,
  rateLimit: 100,
  patchData: false,
  GTM_Id: '',
  USAGE_ENDPOINTS_KEY: process.env.USAGE_ENDPOINTS_KEY || 'ceba96f6eafd2ea59e68a0b0d754a939',
}

export const ARCHIVER_INFO = `${config.archiverInfo.ip}:${config.archiverInfo.port}:${config.archiverInfo.publicKey}`

export const RPC_DATA_SERVER_URL = `http://${config.host}:${config.port.rpc_data_collector}`
