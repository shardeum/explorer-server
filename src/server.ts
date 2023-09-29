// require("dotenv").config();

import fastifyCors from '@fastify/cors'
import fastifyNextjs from '@fastify/nextjs'
import fastifyRateLimit from '@fastify/rate-limit'
import FastifyWebsocket from '@fastify/websocket'
import * as crypto from '@shardus/crypto-utils'
import axios from 'axios'
import Fastify from 'fastify'
import * as usage from './middleware/usage'
import * as StatsStorage from './stats'
import * as CoinStats from './stats/coinStats'
import * as TransactionStats from './stats/transactionStats'
import * as ValidatorStats from './stats/validatorStats'
import * as Storage from './storage'
import * as Account from './storage/account'
import * as Cycle from './storage/cycle'
import * as Log from './storage/log'
import * as Receipt from './storage/receipt'
import * as Transaction from './storage/transaction'
import * as OriginalTxData from './storage/originalTxData'
import {
  AccountSearchType,
  AccountType,
  OriginalTxResponse,
  TokenTx,
  Transaction as TransactionInterface,
  OriginalTxDataInterface,
  TransactionSearchType,
  TransactionType,
} from './types'
import * as utils from './utils'
// config variables
import { config as CONFIG } from './config'
import {
  coinStatsCacheRecord,
  isCacheRecordValid,
  transactionStatsCacheRecord,
  validatorStatsCacheRecord,
} from './class/cache_per_cycle'
import {
  AccountResponse,
  AddressResponse,
  CoinResponse,
  ErrorResponse,
  LogResponse,
  ReceiptResponse,
  TokenResponse,
  TransactionResponse,
} from './types'
import { getStakeTxBlobFromEVMTx, getTransactionObj } from './utils/decodeEVMRawTx'

crypto.init('69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')

if (process.env.PORT) {
  CONFIG.port.server = process.env.PORT
}

console.log(process.argv)
const port = process.argv[2]
if (port) {
  CONFIG.port.server = port
}
console.log('Port', CONFIG.port.server)

interface RequestParams {
  counter: string
}

interface RequestQuery {
  page: string
  count: string
  from: string
  to: string
  cycle: number
  partition: number
  txId: string
  txHash: string
  address: string
  contractAddress: string
  token: string
  filterAddress: string
  txType: string
  startCycle: string
  endCycle: string
  start: string
  end: string
  marker: string
  type: string //contract accounts list query
  accountType: string
  accountId: string
  topics: string
  responseType: string
  fromBlock: string
  toBlock: string
  totalStakeData: string
  beforeTimestamp: string
  afterTimestamp: string
  blockNumber: string
  blockHash: string
  decode: string // For originalTxsData, reply the query result by decoding the data
  pending: string // For pending txs (AllExceptInternalTx) for pending txs page
}

let txHashQueryCache = new Map()
const txHashQueryCacheSize = 1000

async function getLatestCycleNumber(): Promise<number> {
  const latestCycleRecords = await Cycle.queryLatestCycleRecords(1)
  const latestCycleNumber = latestCycleRecords.length > 0 ? latestCycleRecords[0].counter : 0
  return latestCycleNumber
}

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

  // await server.register(fastifyMiddie)
  server.addHook('preHandler', usage.usageMiddleware)
  server.addHook('onError', usage.usageErrorMiddleware)
  server.post('/usage/enable', usage.usageEnableHandler)
  server.post('/usage/disable', usage.usageDisableHandler)
  server.get('/usage/metrics', usage.usageMetricsHandler)

  server.get('/port', (req, reply) => {
    reply.send({ port: CONFIG.port.server })
  })

  server.get('/api/cycleinfo', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      to: 's?',
      from: 's?',
      marker: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    let cycles = []
    if (query.count) {
      let count: number = parseInt(query.count)
      if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      if (count > 100) count = 100 // set to show max 100 cycles
      cycles = await Cycle.queryLatestCycleRecords(count)
    } else if (query.to && query.from) {
      const from = parseInt(query.from)
      const to = parseInt(query.to)
      if (!(from >= 0 && to >= from) || Number.isNaN(from) || Number.isNaN(to)) {
        console.log('Invalid start and end counters for cycleinfo')
        reply.send({
          success: false,
          error: 'Invalid from and to counter for cycleinfo',
        })
        return
      }
      cycles = await Cycle.queryCycleRecordsBetween(from, to)
      // console.log('cycles', cycles);
    } else if (query.marker) {
      const cycle = await Cycle.queryCycleByMarker(query.marker)
      if (cycle) {
        cycles.push(cycle)
      }
    } else {
      reply.send({
        success: false,
        error: 'not specified which cycle to show',
      })
      return
    }
    const res = {
      success: true,
      cycles,
    }
    reply.send(res)
  })

  server.get('/api/account', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      page: 's?',
      address: 's?',
      type: 's?', // To extract contract accounts list (type='contract'); otherwise, all account types will be returned
      accountType: 's?',
      startCycle: 's?',
      endCycle: 's?',
      accountId: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    const itemsPerPage = 10
    let totalPages = 0
    let totalAccounts = 0
    let totalContracts = 0
    let accounts
    if (query.count) {
      const count: number = parseInt(query.count)
      //max 1000 accounts
      if (count > 1000) {
        reply.send({ success: false, error: 'The count number is too big.' })
        return
      } else if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      accounts = await Account.queryAccounts(0, count)
    } else if (query.address) {
      let accountType = AccountType.Account
      if (query.accountType) {
        accountType = parseInt(query.accountType)
      }
      const account = await Account.queryAccountByAddress(query.address.toLowerCase(), accountType)
      if (account) accounts = [account]
    } else if (query.accountId) {
      if (query.accountId.length !== 64) {
        reply.send({ success: false, error: 'Invalid account id' })
        return
      }
      const account = await Account.queryAccountByAccountId(query.accountId.toLowerCase())
      if (account) accounts = [account]
    } else if (query.type) {
      const type: number = parseInt(query.type)
      totalAccounts = await Account.queryAccountCount(type)
      if (query.page) {
        const page: number = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
        // checking totalPages first
        totalPages = Math.ceil(totalAccounts / itemsPerPage)
        if (page > totalPages) {
          reply.send({
            success: false,
            error: 'Page no is greater than the totalPage',
          })
        }
        accounts = await Account.queryAccounts((page - 1) * itemsPerPage, itemsPerPage, type)
      }
    } else if (query.startCycle && query.endCycle) {
      const startCycle: number = parseInt(query.startCycle)
      const endCycle: number = parseInt(query.endCycle)
      if (startCycle < 0 || Number.isNaN(startCycle)) {
        reply.send({ success: false, error: 'Invalid start cycle number' })
        return
      }
      if (endCycle < 0 || Number.isNaN(endCycle)) {
        reply.send({ success: false, error: 'Invalid end cycle number' })
        return
      }
      totalAccounts = await Account.queryAccountCountBetweenCycles(startCycle, endCycle)
      if (query.page) {
        const page: number = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
        totalPages = Math.ceil(totalAccounts / itemsPerPage)
        if (page > totalPages) {
          reply.send({
            success: false,
            error: 'Page no is greater than the totalPage',
          })
        }
        accounts = await Account.queryAccountsBetweenCycles(
          (page - 1) * itemsPerPage,
          itemsPerPage,
          startCycle,
          endCycle
        )
      }
    } else if (query.page) {
      const page: number = parseInt(query.page)
      if (page <= 0 || Number.isNaN(page)) {
        reply.send({ success: false, error: 'Invalid page number' })
        return
      }
      // checking totalPages first
      totalAccounts = await Account.queryAccountCount()
      totalPages = Math.ceil(totalAccounts / itemsPerPage)
      if (page > totalPages) {
        reply.send({
          success: false,
          error: 'Page no is greater than the totalPage',
        })
      }
      accounts = await Account.queryAccounts((page - 1) * itemsPerPage, itemsPerPage)
    } else {
      reply.send({
        success: false,
        error: 'not specified which transaction to show',
      })
      return
    }
    const res: AccountResponse = {
      success: true,
      accounts,
    }
    if (query.page) {
      res.totalPages = totalPages
      res.totalAccounts = totalAccounts
    }
    if (query.count) {
      totalAccounts = await Account.queryAccountCount()
      res.totalAccounts = totalAccounts
      if (query.type) {
        const type = parseInt(query.type)
        totalContracts = await Account.queryAccountCount(type)
        res.totalContracts = totalContracts
      }
    }
    if (query.startCycle) {
      res.totalAccounts = totalAccounts
    }
    reply.send(res)
  })

  server.get('/api/token', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      page: 's?',
      address: 's?',
      contractAddress: 's?',
      tokenType: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    const itemsPerPage = 10
    let totalPages = 0
    let totalTokenHolders = 0
    let tokens
    if (query.address) {
      tokens = await Account.queryTokensByAddress(query.address.toLowerCase(), true)
      reply.send({ success: true, tokens })
      return
    } else if (query.contractAddress) {
      totalTokenHolders = await Account.queryTokenHolderCount(query.contractAddress.toLowerCase())
      if (!query.page) {
        reply.send({ success: true, totalTokenHolders })
        return
      }

      const page: number = parseInt(query.page)
      if (page <= 0 || Number.isNaN(page)) {
        reply.send({ success: false, error: 'Invalid page number' })
        return
      }
      // checking totalPages first
      totalPages = Math.ceil(totalTokenHolders / itemsPerPage)
      if (page > totalPages) {
        reply.send({
          success: false,
          error: 'Page no is greater than the totalPage',
        })
      }
      tokens = await Account.queryTokenHolders(
        (page - 1) * itemsPerPage,
        itemsPerPage,
        query.contractAddress.toLowerCase()
      )
    } else {
      reply.send({
        success: false,
        error: 'not specified which token to show',
      })
      return
    }
    const res: TokenResponse = {
      success: true,
      totalTokenHolders,
    }
    if (query.page) {
      res.tokens = tokens
      res.totalPages = totalPages
    }
    reply.send(res)
  })

  server.get('/api/transaction', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      page: 's?',
      txHash: 's?',
      address: 's?',
      token: 's?',
      filterAddress: 's?',
      txType: 's?',
      startCycle: 's?',
      endCycle: 's?',
      txId: 's?',
      type: 's?', // This is sent with txHash. To query from db again and update the cache!
      totalStakeData: 's?',
      beforeTimestamp: 's?',
      afterTimestamp: 's?',
      blockNumber: 's?',
      blockHash: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    // console.log('Request', _request.query);
    const query = _request.query as RequestQuery
    const itemsPerPage = 10
    let totalPages = 0
    let totalTransactions = 0
    let totalStakeTxs = 0
    let totalUnstakeTxs = 0
    let transactions: (TransactionInterface | TokenTx<string> | OriginalTxDataInterface)[]
    let txType: TransactionSearchType
    let filterAddressTokenBalance = 0
    if (query.txType) {
      txType = parseInt(query.txType)
    }
    if (query.count) {
      const count: number = parseInt(query.count)
      //max 1000 transactions
      if (count > 1000) {
        reply.send({ success: false, error: 'The count number is too big.' })
        return
      } else if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      // Temp change to show the last <count> transactions excluding internal txs
      transactions = await Transaction.queryTransactions(
        0,
        count,
        null,
        TransactionSearchType.AllExceptInternalTx
      )
    } else if (query.startCycle) {
      const startCycle: number = parseInt(query.startCycle)
      if (startCycle < 0 || Number.isNaN(startCycle)) {
        reply.send({ success: false, error: 'Invalid start cycle number' })
        return
      }
      let endCycle = startCycle + 100
      if (query.endCycle) {
        endCycle = parseInt(query.endCycle)
        if (endCycle < 0 || Number.isNaN(endCycle)) {
          reply.send({ success: false, error: 'Invalid end cycle number' })
          return
        }
        if (endCycle - startCycle > 100) {
          reply.send({ success: false, error: 'The cycle range is too big. Max cycle range is 100 cycles.' })
          return
        }
      }
      totalTransactions = await Transaction.queryTransactionCountBetweenCycles(
        startCycle,
        endCycle,
        query.address && query.address.toLowerCase()
      )
      const res: TransactionResponse = {
        success: true,
        totalTransactions,
      }
      if (query.page) {
        const page: number = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
        // checking totalPages first
        totalPages = Math.ceil(totalTransactions / itemsPerPage)
        if (page > totalPages) {
          reply.send({
            success: false,
            error: 'Page no is greater than the totalPage',
          })
        }
        transactions = await Transaction.queryTransactionsBetweenCycles(
          (page - 1) * itemsPerPage,
          itemsPerPage,
          startCycle,
          endCycle,
          query.address && query.address.toLowerCase()
        )
        res.transactions = transactions
        res.totalPages = totalPages
      }
      reply.send(res)
      return
    } else if (query.beforeTimestamp || query.afterTimestamp) {
      let beforeTimestamp = 0
      let afterTimestamp = 0
      if (query.beforeTimestamp) beforeTimestamp = parseInt(query.beforeTimestamp)
      if (beforeTimestamp < 0 || Number.isNaN(beforeTimestamp)) {
        reply.send({ success: false, error: 'Invalid before timestamp' })
        return
      }
      if (query.afterTimestamp) afterTimestamp = parseInt(query.afterTimestamp)
      if (afterTimestamp < 0 || Number.isNaN(afterTimestamp)) {
        reply.send({ success: false, error: 'Invalid after timestamp' })
        return
      }
      // TODO: maybe set the limit in the queryable timestamp range
      const address: string = query.address ? query.address.toLowerCase() : ''
      if (address && address.length !== 42 && address.length !== 64) {
        reply.send({
          success: false,
          error: 'The address is not correct!',
        })
        return
      }
      totalTransactions = await Transaction.queryTransactionCountByTimestamp(
        beforeTimestamp,
        afterTimestamp,
        address
      )
      const res: TransactionResponse = {
        success: true,
        totalTransactions,
      }
      if (query.page) {
        const page: number = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
        // checking totalPages first
        totalPages = Math.ceil(totalTransactions / itemsPerPage)
        if (page > totalPages) {
          reply.send({
            success: false,
            error: 'Page no is greater than the totalPage',
          })
        }
        transactions = await Transaction.queryTransactionsByTimestamp(
          (page - 1) * itemsPerPage,
          itemsPerPage,
          beforeTimestamp,
          afterTimestamp,
          query.address && query.address.toLowerCase()
        )
        res.transactions = transactions
        res.totalPages = totalPages
      }
      reply.send(res)
      return
    } else if (query.address || query.token) {
      const address: string = query.address ? query.address.toLowerCase() : query.token.toLowerCase()
      if (address.length !== 42 && address.length !== 64) {
        reply.send({
          success: false,
          error: 'The address is not correct!',
        })
        return
      }
      let page: number
      if (query.page) {
        page = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
      } else page = 1
      // checking totalPages first
      if (query.token) {
        txType = TransactionSearchType.TokenTransfer
      }
      let filterAddress
      if (query.filterAddress) {
        filterAddress = query.filterAddress.toLowerCase()
        if (filterAddress.length !== 42) {
          reply.send({
            success: false,
            error: 'The filter address is not correct!',
          })
          return
        }
      }
      totalTransactions = await Transaction.queryTransactionCount(address, txType, filterAddress)
      if (totalTransactions <= 0) {
        reply.send({ success: true, transactions: [], totalPages: 0 })
        return
      }
      totalPages = Math.ceil(totalTransactions / itemsPerPage)
      if (page > totalPages) {
        reply.send({
          success: false,
          error: 'Page no is greater than the totalPage',
        })
      }
      transactions = await Transaction.queryTransactions(
        (page - 1) * itemsPerPage,
        itemsPerPage,
        address,
        txType,
        filterAddress
      )
      if (query.filterAddress) {
        const result = await Account.queryTokenBalance(address, filterAddress)
        if (result.success) filterAddressTokenBalance = Number(result.balance)
      }
    } else if (query.page) {
      const page: number = parseInt(query.page)
      if (page <= 0 || Number.isNaN(page)) {
        reply.send({ success: false, error: 'Invalid page number' })
        return
      }
      // checking totalPages first
      if (query.txType) {
        totalTransactions = await Transaction.queryTransactionCount(null, txType)
      } else totalTransactions = await Transaction.queryTransactionCount()
      totalPages = Math.ceil(totalTransactions / itemsPerPage)
      if (page > totalPages) {
        reply.send({
          success: false,
          error: 'Page no is greater than the totalPage',
          totalTransactions,
          totalPages,
        })
      }
      if (query.txType) {
        transactions = await Transaction.queryTransactions(
          (page - 1) * itemsPerPage,
          itemsPerPage,
          null,
          txType
        )
      } else {
        transactions = await Transaction.queryTransactions((page - 1) * itemsPerPage, itemsPerPage)
      }
    } else if (query.txType) {
      totalTransactions = await Transaction.queryTransactionCount(null, txType)
      totalPages = Math.ceil(totalTransactions / itemsPerPage)
    } else if (query.txHash) {
      const txHash = query.txHash.toLowerCase()
      if (txHash.length !== 66) {
        reply.send({
          success: false,
          error: 'The transaction hash is not correct!',
        })
        return
      }
      if (query.type === 'requery') {
        transactions = await Transaction.queryTransactionByHash(txHash, true)
        if (transactions.length > 0) {
          txHashQueryCache.set(txHash, { success: true, transactions })
          const res: TransactionResponse = {
            success: true,
            transactions,
          }
          reply.send(res)
          return
        }
      }
      const found = txHashQueryCache.get(txHash)
      if (found) {
        if (found.success) {
          if (!found.transactions[0].TxStatus) return found
        }
      }
      transactions = await Transaction.queryTransactionByHash(txHash, true)
      if (transactions.length > 0) txHashQueryCache.set(txHash, { success: true, transactions })
      else {
        const originalTx = await OriginalTxData.queryOriginalTxDataByTxHash(txHash)
        if (originalTx) {
          if (originalTx.originalTxData.tx.raw) {
            // EVM Tx
            const txObj = getTransactionObj(originalTx.originalTxData.tx)
            // Custom readableReceipt for originalTxsData
            if (txObj) {
              const readableReceipt = {
                from: txObj.getSenderAddress().toString(),
                to: txObj.to ? txObj.to.toString() : null,
                nonce: txObj.nonce.toString(16),
                value: txObj.value.toString(16),
                data: '0x' + txObj.data.toString(),
                // contractAddress // TODO: add contract address
              }
              if (
                originalTx.transactionType === TransactionType.StakeReceipt ||
                originalTx.transactionType === TransactionType.UnstakeReceipt
              ) {
                const internalTxData: any = getStakeTxBlobFromEVMTx(txObj)
                readableReceipt['internalTxData'] = internalTxData
              }
              originalTx.originalTxData = { ...originalTx.originalTxData, readableReceipt }
            }
          }
          // Assume the tx is expired if the original tx is more than 15 seconds old
          const ExpiredTxTimestamp_MS = 15000
          const txStatus = Date.now() - originalTx.timestamp > ExpiredTxTimestamp_MS ? 'Expired' : 'Pending'
          transactions = [{ ...originalTx, txStatus }]
          txHashQueryCache.set(txHash, { success: true, transactions })
        }
      }
      if (!(transactions.length > 0)) {
        txHashQueryCache.set(txHash, {
          success: false,
          error: 'This transaction is not found!',
        })
        reply.send({
          success: false,
          error: 'This transaction is not found!',
        })
        return
      }
      if (txHashQueryCache.size > txHashQueryCacheSize + 10) {
        // Remove old data
        const extra = txHashQueryCache.size - txHashQueryCacheSize
        const arrayTemp = Array.from(txHashQueryCache)
        arrayTemp.splice(0, extra)
        txHashQueryCache = new Map(arrayTemp)
      }
    } else if (query.txId) {
      const transaction = await Transaction.queryTransactionByTxId(query.txId)
      transactions = [transaction]
    } else if (query.totalStakeData === 'true') {
      txType = TransactionSearchType.StakeReceipt
      totalStakeTxs = await Transaction.queryTransactionCount(null, txType)
      txType = TransactionSearchType.UnstakeReceipt
      totalUnstakeTxs = await Transaction.queryTransactionCount(null, txType)
      const res: TransactionResponse = {
        success: true,
        totalStakeTxs,
        totalUnstakeTxs,
      }
      reply.send(res)
      return
    } else if (query.blockNumber || query.blockHash) {
      const blockNumber = query.blockNumber ? parseInt(query.blockNumber) : null
      const blockHash = query.blockHash ? query.blockHash.toLowerCase() : null

      if (blockNumber && (blockNumber < 0 || Number.isNaN(blockNumber))) {
        return reply.send({ success: false, error: 'invalid block Number' })
      }
      if (blockHash && blockHash.length !== 66) {
        return reply.send({ success: false, error: 'invalid block hash' })
      }
      // totalTransactions = await Transaction.queryTransactionCountByBlock(blockNumber, blockHash)
      transactions = await Transaction.queryTransactionsByBlock(blockNumber, blockHash)
      const res: TransactionResponse = {
        success: true,
        // totalTransactions,
        transactions,
      }
      reply.send(res)
      return
    } else {
      reply.send({
        success: false,
        error: 'not specified which transaction to show',
      })
      return
    }
    const res: TransactionResponse = {
      success: true,
      transactions,
    }
    if (query.page || query.address || query.txType) {
      res.totalPages = totalPages
      res.totalTransactions = totalTransactions
    }
    if (query.count) {
      totalTransactions = await Transaction.queryTransactionCount(null, TransactionSearchType.All)
      res.totalTransactions = totalTransactions
    }
    if (query.filterAddress) {
      res.filterAddressTokenBalance = filterAddressTokenBalance
    }
    reply.send(res)
  })

  server.get('/api/receipt', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      page: 's?',
      txId: 's?',
      startCycle: 's?',
      endCycle: 's?',
      from: 's?',
      to: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    // console.log('Request', _request.query);
    const query = _request.query as RequestQuery
    const itemsPerPage = 10
    let totalPages = 0
    let totalReceipts = 0
    let receipts
    if (query.count) {
      const count: number = parseInt(query.count)
      //max 1000 receipts
      if (count > 1000) {
        reply.send({ success: false, error: 'The count number is too big.' })
        return
      } else if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      receipts = await Receipt.queryReceipts(0, count)
    } else if (query.startCycle) {
      const startCycle: number = parseInt(query.startCycle)
      if (startCycle < 0 || Number.isNaN(startCycle)) {
        reply.send({ success: false, error: 'Invalid start cycle number' })
        return
      }
      let endCycle
      if (query.endCycle) {
        endCycle = parseInt(query.endCycle)
        if (endCycle < 0 || Number.isNaN(endCycle)) {
          reply.send({ success: false, error: 'Invalid end cycle number' })
          return
        }
      } else endCycle = await Cycle.queryCycleCount()
      console.log('endCycle', endCycle, 'startCycle', startCycle)
      totalReceipts = await Receipt.queryReceiptCountBetweenCycles(startCycle, endCycle)
      const res: ReceiptResponse = {
        success: true,
        totalReceipts,
      }
      if (query.page) {
        const page: number = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
        // checking totalPages first
        totalPages = Math.ceil(totalReceipts / itemsPerPage)
        if (page > totalPages) {
          reply.send({
            success: false,
            error: 'Page no is greater than the totalPage',
          })
        }
        receipts = await Receipt.queryReceiptsBetweenCycles(
          (page - 1) * itemsPerPage,
          itemsPerPage,
          startCycle,
          endCycle
        )
        res.receipts = receipts
        res.totalPages = totalPages
      }
      reply.send(res)
      return
    } else if (query.txId) {
      const txId: string = query.txId.toLowerCase()
      receipts = await Receipt.queryReceiptByReceiptId(txId)
    } else if (query.page) {
      const page: number = parseInt(query.page)
      if (page <= 0 || Number.isNaN(page)) {
        reply.send({ success: false, error: 'Invalid page number' })
        return
      }
      // checking totalPages first
      totalReceipts = await Receipt.queryReceiptCount()
      totalPages = Math.ceil(totalReceipts / itemsPerPage)
      if (page > totalPages) {
        reply.send({
          success: false,
          error: 'Page no is greater than the totalPage',
        })
      }
      receipts = await Receipt.queryReceipts((page - 1) * itemsPerPage, itemsPerPage)
    } else {
      reply.send({
        success: false,
        error: 'not specified which receipt to show',
      })
      return
    }
    const res: ReceiptResponse = {
      success: true,
      receipts,
    }
    if (query.page) {
      res.totalPages = totalPages
    }
    if (query.count) {
      totalReceipts = await Receipt.queryReceiptCount()
      res.totalReceipts = totalReceipts
    }
    reply.send(res)
  })

  server.get('/api/originalTx', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      page: 's?',
      txId: 's?',
      txHash: 's?',
      startCycle: 's?',
      endCycle: 's?',
      decode: 's?',
      pending: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    // console.log('Request', _request.query);
    const query = _request.query as RequestQuery
    const itemsPerPage = 10
    let totalPages = 0
    let totalOriginalTxs = 0
    let originalTxs: OriginalTxDataInterface[] | number
    if (query.count) {
      const count: number = parseInt(query.count)
      //max 1000 originalTxs
      if (count > 1000) {
        reply.send({ success: false, error: 'The count number is too big.' })
        return
      } else if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      originalTxs = await OriginalTxData.queryOriginalTxsData(0, count)
    } else if (query.startCycle) {
      const startCycle: number = parseInt(query.startCycle)
      if (startCycle < 0 || Number.isNaN(startCycle)) {
        reply.send({ success: false, error: 'Invalid start cycle number' })
        return
      }
      let endCycle = startCycle + 100
      if (query.endCycle) {
        endCycle = parseInt(query.endCycle)
        if (endCycle < 0 || Number.isNaN(endCycle)) {
          reply.send({ success: false, error: 'Invalid end cycle number' })
          return
        }
        if (endCycle - startCycle > 100) {
          reply.send({ success: false, error: 'The cycle range is too big. Max cycle range is 100 cycles.' })
          return
        }
      }
      totalOriginalTxs = await OriginalTxData.queryOriginalTxDataCount(null, startCycle, endCycle)
      if (query.page) {
        const page: number = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
        // checking totalPages first
        totalPages = Math.ceil(totalOriginalTxs / itemsPerPage)
        if (page > totalPages) {
          reply.send({
            success: false,
            error: 'Page no is greater than the totalPage',
          })
        }
        originalTxs = await OriginalTxData.queryOriginalTxsData(
          (page - 1) * itemsPerPage,
          itemsPerPage,
          null,
          startCycle,
          endCycle
        )
      }
    } else if (query.txId) {
      const txId: string = query.txId.toLowerCase()
      if (txId.length !== 64)
        reply.send({
          success: false,
          error: 'The transaction id is not correct!',
        })
      const originalTx: OriginalTxDataInterface = await OriginalTxData.queryOriginalTxDataByTxId(txId)
      if (originalTx) originalTxs = [originalTx]
      else {
        reply.send({
          success: false,
          error: 'This transaction is not found!',
        })
        return
      }
    } else if (query.txHash) {
      const txHash: string = query.txHash.toLowerCase()
      if (txHash.length !== 66)
        reply.send({
          success: false,
          error: 'The transaction hash is not correct!',
        })
      const originalTx: OriginalTxDataInterface = await OriginalTxData.queryOriginalTxDataByTxHash(txHash)
      if (originalTx) originalTxs = [originalTx]
      else {
        reply.send({
          success: false,
          error: 'This transaction is not found!',
        })
        return
      }
    } else if (query.pending === 'true') {
      let page = 1
      if (query.page) page = parseInt(query.page)
      if (page <= 0 || Number.isNaN(page)) {
        reply.send({ success: false, error: 'Invalid page number' })
        return
      }
      let txType = TransactionSearchType.AllExceptInternalTx
      if (query.txType) {
        txType = parseInt(query.txType)
      }
      // Generally assuming txs before 10 seconds ago are still pending ( Some of them could be processed already)
      const PendingTxTimestamp_MS = 10000
      const afterTimestamp = Date.now() - PendingTxTimestamp_MS

      // checking totalPages first
      totalOriginalTxs = await OriginalTxData.queryOriginalTxDataCount(txType, afterTimestamp)
      totalPages = Math.ceil(totalOriginalTxs / itemsPerPage)
      if (page > totalPages) {
        reply.send({
          success: false,
          error: 'Page no is greater than the totalPage',
        })
      }
      originalTxs = await OriginalTxData.queryOriginalTxsData(
        (page - 1) * itemsPerPage,
        itemsPerPage,
        txType,
        afterTimestamp
      )
    } else if (query.page) {
      const page: number = parseInt(query.page)
      if (page <= 0 || Number.isNaN(page)) {
        reply.send({ success: false, error: 'Invalid page number' })
        return
      }
      // checking totalPages first
      totalOriginalTxs = await OriginalTxData.queryOriginalTxDataCount()
      totalPages = Math.ceil(totalOriginalTxs / itemsPerPage)
      if (page > totalPages) {
        reply.send({
          success: false,
          error: 'Page no is greater than the totalPage',
        })
      }
      originalTxs = await OriginalTxData.queryOriginalTxsData((page - 1) * itemsPerPage, itemsPerPage)
    } else {
      reply.send({
        success: false,
        error: 'not specified which originalTxData to show',
      })
      return
    }
    const res: OriginalTxResponse = {
      success: true,
      originalTxs,
    }
    if (query.page || query.startCycle) {
      res.totalOriginalTxs = totalOriginalTxs
      res.totalPages = totalPages
    }
    if (query.count) {
      totalOriginalTxs = await OriginalTxData.queryOriginalTxDataCount()
      res.totalOriginalTxs = totalOriginalTxs
    }
    if (query.decode === 'true') {
      for (const originalTx of originalTxs as OriginalTxDataInterface[]) {
        if (originalTx.originalTxData.tx.raw) {
          // EVM Tx
          const txObj = getTransactionObj(originalTx.originalTxData.tx)
          // Custom readableReceipt
          if (txObj) {
            const readableReceipt = {
              from: txObj.getSenderAddress().toString(),
              to: txObj.to ? txObj.to.toString() : null,
              nonce: txObj.nonce.toString(16),
              value: txObj.value.toString(16),
              data: '0x' + txObj.data.toString(),
              // contractAddress // TODO: add contract address
            }
            if (
              originalTx.transactionType === TransactionType.StakeReceipt ||
              originalTx.transactionType === TransactionType.UnstakeReceipt
            ) {
              const internalTxData: any = getStakeTxBlobFromEVMTx(txObj)
              readableReceipt['internalTxData'] = internalTxData
            }
            originalTx.originalTxData = { ...originalTx.originalTxData, readableReceipt }
          }
        }
      }
    }
    reply.send(res)
  })

  server.get('/api/log', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      page: 's?',
      address: 's?',
      topic0: 's?',
      topic1: 's?',
      topic2: 's?',
      topic3: 's?',
      type: 's?',
      fromBlock: 's?',
      toBlock: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    if (CONFIG.verbose) console.log('Request', _request.query)
    const query = _request.query as RequestQuery
    for (const key in query) {
      // eslint-disable-next-line security/detect-object-injection
      if (query[key] === 'undefined') {
        // eslint-disable-next-line security/detect-object-injection
        delete query[key]
      }
    }
    if (CONFIG.verbose) console.log('cleaned log query request', query)
    const itemsPerPage = 10
    let totalPages = 0
    let totalLogs = 0
    let logs
    const supportedQueryParams = ['address', 'topics', 'fromBlock', 'toBlock', 'startCycle', 'endCycle']
    let topics = []
    if (query.topics) {
      try {
        const parsedTopics = JSON.parse(query.topics)
        if (parsedTopics && Array.isArray(parsedTopics)) {
          topics = parsedTopics
        }
      } catch (e) {
        console.log(`Error parsing topics: ${e.message}`)
      }
    }

    const transactions: TransactionInterface[] = []
    if (query.count) {
      const count: number = parseInt(query.count)
      //max 1000 logs
      if (count > 1000) {
        reply.send({ success: false, error: 'The count number is too big.' })
        return
      } else if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      logs = await Log.queryLogs(0, count)
      totalLogs = await Log.queryLogCount(0, 0, query.type)
    } else if (Object.keys(query).some((key) => supportedQueryParams.includes(key))) {
      const address: string = query.address ? query.address.toLowerCase() : ''

      let startCycle: number
      let endCycle: number
      if (query.startCycle && query.endCycle) {
        startCycle = parseInt(query.startCycle)
        endCycle = parseInt(query.endCycle)
        if (startCycle < 0 || Number.isNaN(startCycle)) {
          reply.send({ success: false, error: 'Invalid start cycle number' })
          return
        }
        if (endCycle < 0 || Number.isNaN(endCycle)) {
          reply.send({ success: false, error: 'Invalid end cycle number' })
          return
        }
        const count = startCycle - endCycle
        if (count > 100) {
          reply.send({
            success: false,
            error: `Exceed maximum limit of 100 cycles`,
          })
          return
        }
      }
      totalLogs = await Log.queryLogCount(
        startCycle,
        endCycle,
        query.type,
        address,
        topics,
        query.fromBlock,
        query.toBlock
      )

      if (query.page) {
        const page: number = parseInt(query.page)
        if (page <= 0 || Number.isNaN(page)) {
          reply.send({ success: false, error: 'Invalid page number' })
          return
        }
        // checking totalPages first
        totalPages = Math.ceil(totalLogs / itemsPerPage)
        if (page > totalPages) {
          reply.send({
            success: false,
            error: 'Page no is greater than the totalPage',
          })
        }
        logs = await Log.queryLogs(
          (page - 1) * itemsPerPage,
          itemsPerPage,
          startCycle,
          endCycle,
          query.type,
          address,
          topics,
          query.fromBlock,
          query.toBlock
        )
        if (query.type === 'txs') {
          for (let i = 0; i < logs.length; i++) {
            const txs = await Transaction.queryTransactionByHash(logs[i].txHash) // eslint-disable-line security/detect-object-injection
            if (txs.length > 0) {
              const success = txs.filter((tx: any) => tx?.wrappedEVMAccount?.readableReceipt?.status === 1)
              transactions.push(success[0])
            }
            // console.log(logs[i].txHash, transactions) // eslint-disable-line security/detect-object-injection
          }
        }
      }
    } else {
      reply.send({
        success: false,
        error: 'not specified which log to show',
      })
      return
    }
    const res: LogResponse = {
      success: true,
      logs,
      totalLogs,
    }
    if (query.page) {
      res.totalPages = totalPages
    }
    if (query.type === 'txs') {
      res.transactions = transactions
    }
    reply.send(res)
  })

  server.get('/api/stats/validator', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      startCycle: 's?',
      endCycle: 's?',
      responseType: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    let validatorStats = []
    if (query.count) {
      let count: number = parseInt(query.count)
      if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      if (count > 100000) count = 100000 // set to show max 100000 cycles for TEMP

      // Cache enabled only for query string => ?count=1000&responseType=array
      if (query.responseType === 'array' && count === 1000) {
        const latestCycleNumber = await getLatestCycleNumber()
        if (isCacheRecordValid(latestCycleNumber, validatorStatsCacheRecord)) {
          validatorStats = validatorStatsCacheRecord.data
        } else {
          validatorStats = await ValidatorStats.queryLatestValidatorStats(count)
          validatorStatsCacheRecord.setData(latestCycleNumber, validatorStats)
        }
      } else {
        validatorStats = await ValidatorStats.queryLatestValidatorStats(count)
      }
    } else if (query.startCycle && query.endCycle) {
      const startCycle = parseInt(query.startCycle)
      const endCycle = parseInt(query.endCycle)
      if (
        !(startCycle >= 0 && endCycle >= startCycle) ||
        Number.isNaN(startCycle) ||
        Number.isNaN(endCycle)
      ) {
        console.log('Invalid start and end counters for cycleinfo')
        reply.send({
          success: false,
          error: 'Invalid startCycle and endCycle counter for cycleinfo',
        })
        return
      }
      validatorStats = await ValidatorStats.queryValidatorStatsBetween(startCycle, endCycle)
      // console.log('validators', validators);
    } else {
      reply.send({
        success: false,
        error: 'not specified which validators stats to show',
      })
      return
    }
    if (query.responseType && query.responseType === 'array') {
      const temp_array = []
      validatorStats.forEach((item) =>
        temp_array.push([
          item.timestamp * 1000,
          item.active,
          item.activated,
          item.syncing,
          item.joined,
          item.removed,
          item.apoped,
          item.cycle,
        ])
      )
      validatorStats = temp_array
    }
    const res = {
      success: true,
      validatorStats,
    }
    reply.send(res)
  })

  server.get('/api/stats/transaction', async (_request, reply) => {
    const err = utils.validateTypes(_request.query as object, {
      count: 's?',
      startCycle: 's?',
      endCycle: 's?',
      responseType: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    let transactionStats = []
    if (query.count) {
      let count: number = parseInt(query.count)
      if (count <= 0 || Number.isNaN(count)) {
        reply.send({ success: false, error: 'Invalid count' })
        return
      }
      if (count > 100000) count = 100000 // set to show max 100000 cycles for TEMP

      // Cache enabled only for query string => ?count=1000&responseType=array
      if (query.responseType === 'array' && count === 1000) {
        const latestCycleNumber = await getLatestCycleNumber()
        if (isCacheRecordValid(latestCycleNumber, transactionStatsCacheRecord)) {
          transactionStats = transactionStatsCacheRecord.data
        } else {
          transactionStats = await TransactionStats.queryLatestTransactionStats(count)
          transactionStatsCacheRecord.setData(latestCycleNumber, transactionStats)
        }
      } else {
        transactionStats = await TransactionStats.queryLatestTransactionStats(count)
      }
    } else if (query.startCycle && query.endCycle) {
      const startCycle = parseInt(query.startCycle)
      const endCycle = parseInt(query.endCycle)
      if (
        !(startCycle >= 0 && endCycle >= startCycle) ||
        Number.isNaN(startCycle) ||
        Number.isNaN(endCycle)
      ) {
        console.log('Invalid start and end counters for cycleinfo')
        reply.send({
          success: false,
          error: 'Invalid startCycle and endCycle counter for cycleinfo',
        })
        return
      }
      transactionStats = await TransactionStats.queryTransactionStatsBetween(startCycle, endCycle)
      // console.log('transactions', transactions);
    } else {
      reply.send({
        success: false,
        error: 'not specified which transactions stats to show',
      })
      return
    }
    if (query.responseType && query.responseType === 'array') {
      const temp_array = []
      transactionStats.forEach((item) =>
        temp_array.push([
          item.timestamp * 1000,
          item.totalTxs,
          item.totalInternalTxs,
          item.totalStakeTxs,
          item.totalUnstakeTxs,
          item.cycle,
        ])
      )
      transactionStats = temp_array
    }
    const res = {
      success: true,
      transactionStats,
    }
    reply.send(res)
  })

  server.get('/api/stats/coin', async (_request, reply) => {
    let coinStats

    const latestCycleNumber = await getLatestCycleNumber()
    if (isCacheRecordValid(latestCycleNumber, coinStatsCacheRecord)) {
      coinStats = coinStatsCacheRecord.data
    } else {
      coinStats = await CoinStats.queryAggregatedCoinStats()
      coinStatsCacheRecord.setData(latestCycleNumber, coinStats)
    }

    let res: CoinResponse | ErrorResponse
    if (coinStats) {
      res = {
        success: true,
        lastUpdatedCycle: coinStatsCacheRecord.lastUpdatedCycle,
        totalSupply: coinStats.totalSupplyChange + CONFIG.genesisSHMSupply,
        totalStaked: coinStats.totalStakeChange,
      }
    } else {
      res = {
        success: false,
        error: 'No coin stats found',
      }
    }
    reply.send(res)
  })

  server.get('/totalData', async (_request, reply) => {
    const totalCycles = await Cycle.queryCycleCount()
    const totalAccounts = await Account.queryAccountCount(AccountSearchType.All)
    const totalTransactions = await Transaction.queryTransactionCount()
    const totalReceipts = await Receipt.queryReceiptCount()
    const totalOriginalTxs = await OriginalTxData.queryOriginalTxDataCount()
    reply.send({
      totalCycles,
      totalAccounts,
      totalTransactions,
      totalReceipts,
      totalOriginalTxs,
    })
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
