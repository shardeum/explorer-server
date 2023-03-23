export const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: {
    collector: process.env.COLLECTORPORT || '4444',
    server: process.env.PORT || '6001',
    rpc_data_collector: process.env.RPCDCPORT || '4445',
  },
  archiverInfo: {
    ip: process.env.ARCHIVERIP || '139.144.19.178',
    port: process.env.ARCHIVERPORT || '4000',
    publicKey: process.env.ARCHIVERPK || '840e7b59a95d3c5f5044f4bc62ab9fa94bc107d391001141410983502e3cde63',
  },
  rpcInfo: {
    ip: process.env.RPCIP || '172.105.128.203',
    port: process.env.RPCPORT || '8090',
  },
  rpcUrl: ' http://172.105.128.203:8090',
  EXPLORER_DB: 'explorer-db',
  TRANSACTION_DB: 'transaction-db',
  ACCOUNT_DB: 'account-db',
  CONTRACT_DB: 'contract-db',
  CYCLE_DB: 'cycle-db',
  verbose: false,
  experimentalSnapshot: true,
  genesisSHMSupply: 100000000,
}

export const ARCHIVER_URL = `http://${config.archiverInfo.ip}:${config.archiverInfo.port}`

export const RPC_DATA_SERVER_URL = `http://${config.host}:${config.port.rpc_data_collector}`
