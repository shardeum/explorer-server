// require("dotenv").config();

import fastifyCors from '@fastify/cors'
import fastifyNextjs from '@fastify/nextjs'
import fastifyRateLimit from '@fastify/rate-limit'
import FastifyWebsocket from '@fastify/websocket'
import * as crypto from '@shardus/crypto-utils'
import Fastify from 'fastify'
import * as StatsStorage from './stats'
import * as Storage from './storage'
import * as Transaction from './storage/transaction'
import mercurius from 'mercurius'
import { TransactionSearchType } from './types'

crypto.init('69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')

// config variables
import { config as CONFIG } from './config'

if (process.env.PORT) {
  CONFIG.port.server = process.env.PORT
}

console.log(process.argv)
const port = process.argv[2]
if (port) {
  CONFIG.port.server = port
}
console.log('Port', CONFIG.port.server)

// Setup Log Directory
const start = async (): Promise<void> => {
  await Storage.initializeDB()
  await StatsStorage.initializeStatsDB()

  const server = Fastify({
    logger: false,
  })

  await server.register(FastifyWebsocket)
  await server.register(fastifyCors)
  await server.register(fastifyRateLimit, {
    max: CONFIG.rateLimit,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', 'localhost'],
  })
  server
    .register(fastifyNextjs, {
      dev: CONFIG.env !== 'production',
      logLevel: 'debug',
      noServeAssets: false,
    })

    .after(() => {
      server.next('/*')
    })

  server.get('/port', (req, reply) => {
    reply.send({ port: CONFIG.port.server })
  })

  const schema = `
  type WrappedEVMAccount {
    ethAddress: String!
    hash: String!
    timestamp: Int!
    amountSpent: String!
    readableReceipt: ReadableReceipt!
    txFrom: String!
    txId: String!
  }

  type ReadableReceipt {
    status: Int!
    transactionHash: String!
    transactionIndex: String!
    blockNumber: String!
    nonce: String!
    blockHash: String!
    cumulativeGasUsed: String!
    gasUsed: String!
    logs: [String!]!
    logBloom: String!
    contractAddress: String
    from: String!
    to: String
    value: String!
    data: String!
    stakeInfo: StakeInfo
  }

  type StakeInfo {
    nominee: String!
    stakeAmount: String
    totalStakeAmount: String
    totalUnstakeAmount: String
    stake: String
    reward: String
    penalty: String
  }
  
  type Transaction {
    txId: String!
    cycle: Int!
    timestamp: Int!
    wrappedEVMAccount: WrappedEVMAccount!
    accountId: String!
    txFrom: String!
    txTo: String!
    nominee: String
    txHash: String!
    transactionType: Int!
    originTxData: String
  }
  
  type Query {
    transactions: [Transaction!]!
    transactionByTxId(txId: String!): Transaction
    transactionByTxHash(txHash: String!): Transaction
  }
  `

  const resolvers = {
    Query: {
      transactions: async () =>
        await Transaction.queryTransactions(0, 100, null, TransactionSearchType.AllExceptInternalTx),
      transactionByTxId: async (_, { txId }) => await Transaction.queryTransactionByTxId(txId),
      transactionByTxHash: async (_, { txHash }) => await Transaction.queryTransactionByHash(txHash),
    },
  }

  server.register(mercurius, {
    schema,
    resolvers,
    graphiql: true,
  })

  server.listen(
    {
      port: Number(CONFIG.port.server),
      host: '0.0.0.0',
    },
    async (err) => {
      if (err) {
        server.log.error(err)
        console.log(err)
        throw err
      }
      console.log('Shardeum explorer server is listening on port:', CONFIG.port.server)
    }
  )
}

start()
