import dotenv from 'dotenv'
dotenv.config()

import * as Fastify from 'fastify'
import * as utils from './utils'
import fastifyCors from '@fastify/cors'
import { Server, IncomingMessage, ServerResponse } from 'http'

// config variables
import { config as CONFIG } from './config'
if (process.env.PORT) {
  CONFIG.port.rpc_data_collector = process.env.PORT
}

console.log(process.argv)
const port = process.argv[2]
if (port) {
  CONFIG.port.rpc_data_collector = port
}
console.log('Port', CONFIG.port.rpc_data_collector)

interface RequestParams {
  hash: string
}

const txStatusCollector: Map<string, object> = new Map()
const txKeysMap: Map<string, boolean> = new Map()
const txCollectorMaxSize = 10000
const batchCleanSize = 500

const start = async (): Promise<void> => {
  const server: Fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = Fastify.fastify({
    logger: false,
  })

  server.register(fastifyCors)

  server.get('/', (_req, reply) => {
    reply.send({ message: 'Shardeum JSON RPC Data Server!' })
  })

  server.get('/port', (_req, reply) => {
    reply.send({ port })
  })

  server.get('/api/tx/:hash', async (_request, reply) => {
    const err = utils.validateTypes(_request.params as object, { hash: 's' })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const params = _request.params as RequestParams
    const res: {
      success: boolean
      txStatus: object | null
      reason: string
    } = {
      success: false,
      reason: 'This tx hash is not found!',
      txStatus: null,
    }
    if (txStatusCollector.has(params.hash)) {
      res.success = true
      res.txStatus = txStatusCollector.get(params.hash) || null
      res.reason = 'This tx is found!'
    }
    reply.send(res)
  })

  // Debug endpoint
  server.get('/api/txs', async (_request, reply) => {
    const keyArrayTemp = Array.from(txKeysMap.keys())
    const lastestTenTxsKeys = keyArrayTemp.slice(-10)
    const lastestTenTxs: (object | null)[] = []
    if (lastestTenTxsKeys.length > 0) {
      lastestTenTxsKeys.forEach((key) => lastestTenTxs.push(txStatusCollector.get(key) || null))
    }
    const res = {
      success: true,
      txSize: txStatusCollector.size,
      keySize: txKeysMap.size,
      lastestTenTxs,
    }
    reply.send(res)
  })

  function isValidTransactionInfo(obj: unknown): obj is { txHash: string; injected: boolean } {
    return typeof obj === 'object' &&
      obj != null &&
      'txHash' in obj &&
      typeof obj.txHash === 'string' &&
      'injected' in obj &&
      typeof obj.injected === 'boolean'
  }

  server.post('/tx/status', async (_request, reply) => {
    const transactionInfos = _request.body
    let success = false
    if (Array.isArray(transactionInfos) && transactionInfos.length > 0) {
      for (const transactionInfo of transactionInfos) {
        if (isValidTransactionInfo(transactionInfo)) {
          if (txStatusCollector.has(transactionInfo.txHash)) {
            txStatusCollector.delete(transactionInfo.txHash)
            txKeysMap.delete(transactionInfo.txHash)
          }
          txStatusCollector.set(transactionInfo.txHash, transactionInfo)
          txKeysMap.set(transactionInfo.txHash, transactionInfo.injected)
          success = true
        }
      }
      // Remove old data
      if (txStatusCollector.size >= txCollectorMaxSize + batchCleanSize) {
        const keyArrayTemp = Array.from(txKeysMap.keys())
        for (let i = 0; i < batchCleanSize; i++) {
          // eslint-disable-next-line security/detect-object-injection
          const key = keyArrayTemp[i]
          txStatusCollector.delete(key)
          txKeysMap.delete(key)
        }
        console.log('txStatusCollector After cleanup', txStatusCollector.size, txKeysMap.size)
      }
    }
    reply.send({
      success,
    })
  })

  server.listen(Number(CONFIG.port.rpc_data_collector), '0.0.0.0', async (err) => {
    if (err) {
      server.log.error(err)
      console.log(err)
      throw err
    }
    console.log('Shardeum RPC data collector is listening on port:', CONFIG.port.rpc_data_collector)
  })
}

start()
