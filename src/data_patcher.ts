require('dotenv').config()

import { Collector } from './class/Collector'
import * as ioclient from 'socket.io-client'
import * as crypto from '@shardus/crypto-utils'
import * as Storage from './storage'
import * as archivedCycle from './storage/archivedCycle'
import * as Cycle from './storage/cycle'
import * as Receipt from './storage/receipt'
import * as Transaction from './storage/transaction'
import * as Account from './storage/account'
import * as DataSync from './class/DataSync'
import { AccountSearchType, AccountType, TransactionSearchType } from './@type'
import * as StatsStorage from './stats'
import * as ValidatorStats from './stats/validatorStats'
import * as TransactionStats from './stats/transactionStats'
import * as CoinStats from './stats/coinStats'
crypto.init('69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')

// config variables
import { config as CONFIG, ARCHIVER_URL } from './config'
import axios from 'axios'

let startCycle = 0
console.log(process.argv)
let cycleNumberToSyncFrom = process.argv[2]
if (cycleNumberToSyncFrom) {
  startCycle = parseInt(cycleNumberToSyncFrom)
}
console.log('Start Cycle', startCycle)

// Setup Log Directory
const start = async () => {
  await Storage.initializeDB()
  await StatsStorage.initializeStatsDB()

  let lastStoredReceiptCount = await Receipt.queryReceiptCount()
  let lastStoredCycleCount = startCycle

  let totalCyclesToSync = 0
  let response = await axios.get(`${ARCHIVER_URL}/totalData`)
  if (response.data && response.data.totalReceipts >= 0 && response.data.totalCycles >= 0) {
    totalCyclesToSync = response.data.totalCycles
    console.log('totalCyclesToSync', totalCyclesToSync)
  }

  await DataSync.downloadAndSyncGenesisAccounts() // To sync accounts data that are from genesis accounts/accounts data that the network start with

  console.log('startCycle', startCycle, 'totalCyclesToSync', totalCyclesToSync)
  await DataSync.downloadReceiptsBetweenCycles(startCycle, totalCyclesToSync)
  console.log('Patching done! from cycle', startCycle, 'to cycle', totalCyclesToSync)
}

start()
