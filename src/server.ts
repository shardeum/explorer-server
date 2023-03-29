// require("dotenv").config();

import * as Storage from './storage'
import * as ArchivedCycle from './storage/archivedCycle'
import * as Transaction from './storage/transaction'
import * as Account from './storage/account'
import * as Cycle from './storage/cycle'
import * as Receipt from './storage/receipt'
import * as Log from './storage/log'
import * as Fastify from 'fastify'
import * as crypto from '@shardus/crypto-utils'
import * as utils from './utils'
import fastifyCors from '@fastify/cors'
import { Server, IncomingMessage, ServerResponse } from 'http'
import fastifyNextjs from '@fastify/nextjs'
import axios from 'axios'
import { AccountSearchType, AccountType, TransactionSearchType } from './@type'
import * as StatsStorage from './stats'
import * as ValidatorStats from './stats/validatorStats'
import * as TransactionStats from './stats/transactionStats'
import * as CoinStats from './stats/coinStats'

crypto.init('69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')

// config variables
import { config as CONFIG, ARCHIVER_URL, RPC_DATA_SERVER_URL } from './config'
if (process.env.PORT) {
  CONFIG.port.server = process.env.PORT
}

console.log(process.argv)
let port = process.argv[2]
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
  topic0: string
  topic1: string
  topic2: string
  topic3: string
  responseType: string
}

console.log(ARCHIVER_URL)

let txHashQueryCache = new Map()
const txHashQueryCacheSize = 1000

// Setup Log Directory
const start = async () => {
  await Storage.initializeDB()
  await StatsStorage.initializeStatsDB()

  const server: Fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = Fastify.fastify({
    logger: false,
  })

  server.register(fastifyCors)

  server
    .register(fastifyNextjs, {
      dev: process.env.NODE_ENV !== 'production',
      logLevel: 'debug',
      noServeAssets: false,
    })
    .after(() => {
      // console.log(server)
      server.next('/*')
      // server.next("/counter");
      // server.next("/hello");
    })

  server.get('/port', (req, reply) => {
    reply.send({ port })
  })

  server.get('/api/cycleinfo', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
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
    const err = utils.validateTypes(_request.query, {
      count: 's?',
      page: 's?',
      address: 's?',
      type: 's?', // To extract contract accounts list (type='contract'); otherwise, all account types will be returned
      accountType: 's?',
      startCycle: 's?',
      endCycle: 's?',
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
      let account = await Account.queryAccountByAddress(query.address.toLowerCase(), accountType)
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
    const res: any = {
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

  server.get('/api/address', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
      address: 's?',
      accountType: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    let accounts = []
    let account
    if (query.accountType)
      account = await Account.queryAccountByAddress(query.address.toLowerCase(), parseInt(query.accountType))
    else account = await Account.queryAccountByAddress(query.address.toLowerCase())
    if (account) accounts.push(account)
    if (accounts.length === 0) {
      try {
        const queryArchiver = await axios.get(`${ARCHIVER_URL}/nodelist`)
        const activeNode = queryArchiver.data.nodeList[0]
        const result = await axios.get(`http://${activeNode.ip}:${activeNode.port}/account/${query.address}`)
        if (result.data.error || !result.data.account) {
          reply.send({
            success: false,
            error: 'This account is not found!',
          })
          return
        }
        accounts.push({
          account: result.data.account,
          ethAddress: query.address,
        })
      } catch (e) {
        reply.send({
          success: false,
          error: 'This account is not found!',
        })
        return
      }
    }
    const res: any = {
      success: true,
      accounts,
    }
    reply.send(res)
  })

  server.get('/api/token', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
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
    let totalContracts = 0
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
    const res: any = {
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
    const err = utils.validateTypes(_request.query, {
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
    let transactions
    let txType: number
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
      transactions = await Transaction.queryTransactions(0, count)
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
      } else endCycle = await Cycle.queryCyleCount()
      console.log('endCycle', endCycle, 'startCycle', startCycle)
      totalTransactions = await Transaction.queryTransactionCountBetweenCycles(
        startCycle,
        endCycle,
        query.address && query.address.toLowerCase()
      )
      const res: any = {
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
    } else if (query.address || query.token) {
      const address: string = query.address ? query.address.toLowerCase() : query.token.toLowerCase()
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
        let result = await Account.queryTokenBalance(address, filterAddress)
        if (result.success) filterAddressTokenBalance = result.balance
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
      if (query.txHash.length !== 66) {
        reply.send({
          success: false,
          error: 'The transaction hash is not correct!',
        })
        return
      }
      if (query.type === 'requery') {
        let transaction = await Transaction.queryTransactionByHash(query.txHash.toLowerCase(), true)
        if (transaction) {
          transactions = [transaction]
          txHashQueryCache.set(query.txHash, { success: true, transactions })
          const res: any = {
            success: true,
            transactions,
          }
          reply.send(res)
          return
        }
      }
      let acceptedTx = false
      let result
      try {
        // result = await axios.get(
        //   `http://localhost:${CONFIG.port.rpc_data_collector}/api/tx/${query.txHash}`
        // );
        result = await axios.get(`${RPC_DATA_SERVER_URL}/api/tx/${query.txHash}`)
      } catch (e) {
        console.log(`RPC Data Collector is not responding`, e)
      }
      if (result && result.data && result.data.txStatus) {
        if (!result.data.txStatus.injected || !result.data.txStatus.accepted) {
          reply.send({
            success: false,
            transactions: [{ txStatus: result.data.txStatus }],
          })
          return
        }
        acceptedTx = result.data.txStatus.accepted
      }
      let found = txHashQueryCache.get(query.txHash)
      if (found) {
        if (found.success) return found
        if (!acceptedTx) return found
      }
      let transaction = await Transaction.queryTransactionByHash(query.txHash.toLowerCase(), true)
      if (transaction) transactions = [transaction]
      if (transaction) txHashQueryCache.set(query.txHash, { success: true, transactions })
      else
        txHashQueryCache.set(query.txHash, {
          success: false,
          error: 'This transaction is not found!',
        })
      if (txHashQueryCache.size > txHashQueryCacheSize + 10) {
        // Remove old data
        let extra = txHashQueryCache.size - txHashQueryCacheSize
        let arrayTemp = Array.from(txHashQueryCache)
        arrayTemp.splice(0, extra)
        txHashQueryCache = new Map(arrayTemp)
      }
    } else if (query.txId) {
      let transaction = await Transaction.queryTransactionByTxId(query.txId)
      transactions = [transaction]
    } else {
      reply.send({
        success: false,
        error: 'not specified which transaction to show',
      })
      return
    }
    const res: any = {
      success: true,
      transactions,
    }
    if (query.page || query.address || query.txType) {
      res.totalPages = totalPages
      res.totalTransactions = totalTransactions
    }
    if (query.count) {
      totalTransactions = await Transaction.queryTransactionCount()
      if (query.txType) {
        if (
          txType === TransactionSearchType.StakeReceipt ||
          txType === TransactionSearchType.UnstakeReceipt
        ) {
          txType = TransactionSearchType.StakeReceipt
          const totalStakeTxs = await Transaction.queryTransactionCount(null, txType)
          res.totalStakeTxs = totalStakeTxs
          txType = TransactionSearchType.UnstakeReceipt
          const totalUnStakeTxs = await Transaction.queryTransactionCount(null, txType)
          res.totalUnStakeTxs = totalUnStakeTxs
        } else {
          const totalRewardTxs = await Transaction.queryTransactionCount(null, txType)
          res.totalRewardTxs = totalRewardTxs
        }
      }
      res.totalTransactions = totalTransactions
    }
    if (query.filterAddress) {
      res.filterAddressTokenBalance = filterAddressTokenBalance
    }
    reply.send(res)
  })

  // Seems we can remove this endpoint now.
  server.get('/api/tx', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
      txHash: 's?',
      type: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    let transactions = []
    const res: any = {
      success: true,
      transactions,
    }
    if (query.txHash.length !== 66) {
      reply.send({
        success: false,
        error: 'The transaction hash is not correct!',
      })
      return
    }
    if (query.type === 'requery') {
      let transaction = await Transaction.queryTransactionByHash(query.txHash.toLowerCase(), true)
      if (transaction) {
        transactions = [transaction]
        txHashQueryCache.set(query.txHash, { success: true, transactions })
        res.transactions = transactions
        reply.send(res)
        return
      }
    }
    let acceptedTx = false
    let result
    try {
      // result = await axios.get(
      //   `http://localhost:${CONFIG.port.rpc_data_collector}/api/tx/${query.txHash}`
      // );
      result = await axios.get(`${RPC_DATA_SERVER_URL}/api/tx/${query.txHash}`)
    } catch (e) {
      console.log(`RPC Data Collector is not responding`, e)
    }
    if (result && result.data && result.data.txStatus) {
      if (!result.data.txStatus.injected || !result.data.txStatus.accepted) {
        res.success = false
        res.transactions.push({ txStatus: result.data.txStatus })
      }
      acceptedTx = result.data.txStatus.accepted
    }
    if (res.success) {
      let found = txHashQueryCache.get(query.txHash)
      if (found) {
        if (found.success) return found
        if (!acceptedTx) return found
      }
      let transaction = await Transaction.queryTransactionByHash(query.txHash.toLowerCase(), true)
      // console.log('transaction result', query.txHash, transactions)
      if (transaction) {
        res.transactions.push(transaction)
      } else {
        try {
          const queryArchiver = await axios.get(`${ARCHIVER_URL}/nodelist`)
          const activeNode = queryArchiver.data.nodeList[0]
          result = await axios.get(`http://${activeNode.ip}:${activeNode.port}/tx/${query.txHash}`)
          if (result.data && result.data.account) {
            // console.log('transaction result', result.status, result.data)
            res.transactions.push({ wrappedEVMAccount: result.data.account })
          }
        } catch (e) {
          console.log(`Archiver ${ARCHIVER_URL} is not responding`, e)
        }
      }
      if (!transaction) {
        delete res.transactions
        res.success = false
        res.error = 'This transaction is not found!'
      }
      txHashQueryCache.set(query.txHash, res)
      if (txHashQueryCache.size > txHashQueryCacheSize + 10) {
        // Remove old data
        let extra = txHashQueryCache.size - txHashQueryCacheSize
        let arrayTemp = Array.from(txHashQueryCache)
        arrayTemp.splice(0, extra)
        txHashQueryCache = new Map(arrayTemp)
      }
    }
    reply.send(res)
  })

  server.get('/api/cycleinfo/:counter', async (_request, reply) => {
    const err = utils.validateTypes(_request.params, { counter: 's' })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const params = _request.params as RequestParams
    const counter: number = parseInt(params.counter)
    //cycle counter starts from 0
    if (counter < 0 || Number.isNaN(counter)) {
      reply.send({ success: false, error: 'Invalid counter' })
      return
    }
    const cycle = await Cycle.queryCycleByCounter(counter)
    const res = {
      success: true,
      cycle,
    }
    reply.send(res)
  })

  server.get('/api/archive/:counter', async (_request, reply) => {
    const err = utils.validateTypes(_request.params, { counter: 's' })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const params = _request.params as RequestParams
    const counter: number = parseInt(params.counter)
    //cycle counter starts from 0
    if (counter < 0 || Number.isNaN(counter)) {
      reply.send({ success: false, error: 'Invalid counter' })
      return
    }
    const archivedCycle = await ArchivedCycle.queryArchivedCycleByCounter(counter)
    const res = {
      success: true,
      archivedCycle,
    }
    reply.send(res)
  })

  server.get('/api/archive', async (_request, reply) => {
    let err = utils.validateTypes(_request.query, {
      start: 's?',
      end: 's?',
      count: 's?',
      marker: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    const query = _request.query as RequestQuery
    let archivedCycles = []
    if (query.start && query.end) {
      let from = parseInt(query.start)
      let to = parseInt(query.end)
      if (!(from >= 0 && to >= from) || Number.isNaN(from) || Number.isNaN(to)) {
        reply.send({
          success: false,
          error: `Invalid start and end counters`,
        })
        return
      }
      let count = to - from
      if (count > 100) {
        reply.send({
          success: false,
          error: `Exceed maximum limit of 100 cycles`,
        })
        return
      }
      archivedCycles = await ArchivedCycle.queryAllArchivedCyclesBetween(from, to)
    }
    if (query.count) {
      let count = parseInt(query.count)
      if (count > 100) {
        reply.send({
          success: false,
          error: `Exceed maximum limit of 100 cycles`,
        })
        return
      }
      archivedCycles = await ArchivedCycle.queryAllArchivedCycles(count)
    }
    if (query.marker) {
      let archivedCycle = await ArchivedCycle.queryArchivedCycleByMarker(query.marker)
      if (archivedCycle) {
        archivedCycles.push(archivedCycle)
      }
    }
    const res = {
      success: true,
      archivedCycles,
    }
    reply.send(res)
  })

  server.get('/api/receipt', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
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
      } else endCycle = await Cycle.queryCyleCount()
      console.log('endCycle', endCycle, 'startCycle', startCycle)
      totalReceipts = await Receipt.queryReceiptCountBetweenCycles(startCycle, endCycle)
      const res: any = {
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
    const res: any = {
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

  server.get('/api/log', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
      count: 's?',
      page: 's?',
      address: 's?',
      topic0: 's?',
      topic1: 's?',
      topic2: 's?',
      topic3: 's?',
      type: 's?',
    })
    if (err) {
      reply.send({ success: false, error: err })
      return
    }
    // console.log('Request', _request.query);
    const query = _request.query as RequestQuery
    const itemsPerPage = 10
    let totalPages = 0
    let totalLogs = 0
    let logs
    let transactions = []
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
      totalLogs = await Log.queryLogCount(query.type)
    } else if (query.address || query.topic0 || query.startCycle || query.endCycle) {
      let address: string = query.address ? query.address.toLowerCase() : ''

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
        let count = startCycle - endCycle
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
        query.topic0,
        query.topic1,
        query.topic2,
        query.topic3
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
          query.topic0,
          query.topic1,
          query.topic2,
          query.topic3
        )
        if (query.type === 'txs') {
          for (let i = 0; i < logs.length; i++) {
            const transaction = await Transaction.queryTransactionByHash(logs[i].txHash)
            console.log(logs[i].txHash, transaction)
            transactions.push(transaction)
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
    const res: any = {
      success: true,
      logs,
    }
    if (query.page) {
      res.totalPages = totalPages
    }
    if (query.type === 'txs') {
      res.transactions = transactions
    }
    res.totalLogs = totalLogs
    reply.send(res)
  })

  server.get('/api/stats/validator', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
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
      if (count > 10000) count = 10000 // set to show max 10000 cycles
      validatorStats = await ValidatorStats.queryLatestValidatorStats(count)
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
      let temp_array = []
      validatorStats.forEach((item) => temp_array.push([item.timestamp * 1000, item.active, item.cycle]))
      validatorStats = temp_array
    }
    const res = {
      success: true,
      validatorStats,
    }
    reply.send(res)
  })

  server.get('/api/stats/transaction', async (_request, reply) => {
    const err = utils.validateTypes(_request.query, {
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
      if (count > 10000) count = 10000 // set to show max 10000 cycles
      transactionStats = await TransactionStats.queryLatestTransactionStats(count)
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
      let temp_array = []
      transactionStats.forEach((item) =>
        temp_array.push([
          item.timestamp * 1000,
          item.totalTxs,
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
    const coinStats = await CoinStats.queryAggregatedCoinStats()
    let res: any
    if (coinStats) {
      res = {
        success: true,
        totalSupply: coinStats.totalSupplyChange + CONFIG.genesisSHMSupply,
        totalStaked: coinStats.totalStakeChange,
      }
      // console.log('CoinStats response', coinStats)
    } else {
      res = {
        success: false,
        error: 'No coin stats found',
      }
    }
    reply.send(res)
  })

  server.get('/totalData', async (_request, reply) => {
    const totalCycles = await Cycle.queryCyleCount()
    const totalAccounts = await Account.queryAccountCount(AccountSearchType.All)
    const totalTransactions = await Transaction.queryTransactionCount()
    const totalReceipts = await Receipt.queryReceiptCount()
    reply.send({
      totalCycles,
      totalAccounts,
      totalTransactions,
      totalReceipts,
    })
  })

  server.listen(Number(CONFIG.port.server), '0.0.0.0', async (err) => {
    if (err) {
      server.log.error(err)
      console.log(err)
      throw err
    }
    console.log('Shardeum explorer server is listening on port:', CONFIG.port.server)
  })
}

start()
