export const config = {
  env: process.env.NODE_ENV || 'development', // development, production
  host: process.env.HOST || '127.0.0.1',
  port: {
    collector: process.env.COLLECTORPORT || '4444',
    server: process.env.PORT || '6001',
    rpc_data_collector: process.env.RPCDCPORT || '4445',
  },
  archiverInfo: {
    ip: process.env.ARCHIVERIP || 'localhost',
    port: process.env.ARCHIVERPORT || '4000',
    publicKey: process.env.ARCHIVERPK || '758b1c119412298802cd28dbfa394cdfeecc4074492d60844cc192d632d84de3',
  },
  rpcUrl: process.env.RPC_URL || 'http://localhost:8080',
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
}

export const ARCHIVER_URL = `http://${config.archiverInfo.ip}:${config.archiverInfo.port}`

export const RPC_DATA_SERVER_URL = `http://${config.host}:${config.port.rpc_data_collector}`
