export const config = {
  env: process.env.NODE_ENV || 'development',
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
  rpcInfo: {
    ip: process.env.RPCIP || 'localhost',
    port: process.env.RPCPORT || '8080',
  },
  EXPLORER_DB: 'explorer-db',
  TRANSACTION_DB: 'transaction-db',
  ACCOUNT_DB: 'account-db',
  CONTRACT_DB: 'contract-db',
  CYCLE_DB: 'cycle-db',
  verbose: false,
  experimentalSnapshot: true,
}

export const ARCHIVER_URL = `http://${config.archiverInfo.ip}:${config.archiverInfo.port}`
