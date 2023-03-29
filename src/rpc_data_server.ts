require('dotenv').config()

import * as Fastify from 'fastify'
import * as crypto from '@shardus/crypto-utils'
import * as utils from './utils'
import fastifyCors from '@fastify/cors'
import { Server, IncomingMessage, ServerResponse } from 'http'

// config variables
import { config as CONFIG } from './config'
if (process.env.PORT) {
  CONFIG.port.rpc_data_collector = process.env.PORT
}

console.log(process.argv)
let port = process.argv[2]
if (port) {
  CONFIG.port.rpc_data_collector = port
}
console.log('Port', CONFIG.port.rpc_data_collector)

interface RequestParams {
  hash: string
}

let txStatusCollector: Map<string, object> = new Map()
let txKeysMap: Map<string, boolean> = new Map()
const txCollectorMaxSize = 10000
const batchCleanSize = 500

const start = async () => {
  const server: Fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = Fastify.fastify({
    logger: false,
  })

  server.register(fastifyCors)

  server.get('/', (req, reply: any) => {
    reply.send({ message: 'Shardeum JSON RPC Data Server!' })
  })

  server.get('/port', (req, reply) => {
    reply.send({ port })
  })

  server.get('/api/tx/:hash', async (_request, reply) => {
    const err = utils.validateTypes(_request.params, { hash: 's' })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const params = _request.params as RequestParams
    let res = {
      success: false,
      reason: 'This tx hash is not found!',
      txStatus: null,
    }
    if (txStatusCollector.has(params.hash)) {
      res.success = true
      res.txStatus = txStatusCollector.get(params.hash)
      res.reason = 'This tx is found!'
    }
    reply.send(res)
  })

  // Debug endpoint
  server.get('/api/txs', async (_request, reply) => {
    let keyArrayTemp = Array.from(txKeysMap.keys())
    const lastestTenTxsKeys = keyArrayTemp.slice(-10)
    let lastestTenTxs = []
    if (lastestTenTxsKeys.length > 0) {
      lastestTenTxsKeys.forEach((key) => lastestTenTxs.push(txStatusCollector.get(key)))
    }
    let res = {
      success: true,
      txSize: txStatusCollector.size,
      keySize: txKeysMap.size,
      lastestTenTxs,
    }
    reply.send(res)
  })

  server.post('/tx/status', async (_request, reply) => {
    const transactionInfos: any = _request.body
    let success = false
    if (transactionInfos.length > 0) {
      for (const transactionInfo of transactionInfos) {
        if (transactionInfo.txHash) {
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
        // let arrayTemp = Array.from(txStatusCollector)
        // arrayTemp.splice(0, batchCleanSize)
        // txStatusCollector = new Map(arrayTemp)

        let keyArrayTemp = Array.from(txKeysMap.keys())
        for (let i = 0; i < batchCleanSize; i++) {
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
