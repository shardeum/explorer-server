// require("dotenv").config();

import * as crypto from '@shardus/crypto-utils'
import cron from 'node-cron'
import * as StatsStorage from './stats'
import * as CoinStats from './stats/coinStats'
import * as TransactionStats from './stats/transactionStats'
import * as ValidatorStats from './stats/validatorStats'
import * as Storage from './storage'
import * as Cycle from './storage/cycle'
import * as StatsFunctions from './class/StatsFunctions'

crypto.init('69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')

// config variables
import { config as CONFIG } from './config'
if (process.env.PORT) {
  CONFIG.port.server = process.env.PORT
}

const measure_time = false
let start_time

const start = async () => {
  await Storage.initializeDB()

  await StatsStorage.initializeStatsDB()
  let lastCheckedCycleForValidators = -1
  let lastCheckedCycleForTxs = -1
  let lastCheckedCycleForCoinStats = -1
  let waitCycleForStats = 5 // Calculate transactions count per Cycle after 5 cycles

  let lastStoredValidators = await ValidatorStats.queryLatestValidatorStats(1)
  if (lastStoredValidators.length > 0) lastCheckedCycleForValidators = lastStoredValidators[0].cycle

  let lastStoredTransactions = await TransactionStats.queryLatestTransactionStats(1)
  if (lastStoredTransactions.length > 0) lastCheckedCycleForTxs = lastStoredTransactions[0].cycle

  let lastStoredCoinStats = await CoinStats.queryLatestCoinStats(1)
  if (lastStoredCoinStats.length > 0) lastCheckedCycleForCoinStats = lastStoredCoinStats[0].cycle

  console.log('lastCheckedCycleForValidators', lastCheckedCycleForValidators)
  if (measure_time) start_time = process.hrtime()
  cron.schedule('* * * * *', async () => {
    console.log('Running cron task....')
    if (measure_time && start_time) {
      var end_time = process.hrtime(start_time)
      console.log('End Time', end_time)
      start_time = process.hrtime()
    }
    let latestCycleRecord = await Cycle.queryLatestCycleRecords(1)
    let latestCycleCounter = latestCycleRecord.length > 0 ? latestCycleRecord[0].counter : 0
    console.log('latestCycleCounter', latestCycleCounter)
    if (latestCycleCounter > lastCheckedCycleForValidators) {
      if (latestCycleCounter - lastCheckedCycleForValidators === 1)
        await StatsFunctions.insertValidatorStats(latestCycleRecord[0].cycleRecord)
      else StatsFunctions.recordOldValidatorsStats(latestCycleCounter, lastCheckedCycleForValidators)
      lastCheckedCycleForValidators = latestCycleCounter
    }
    // console.log(latestCycleCounter - waitCycleForTxs, lastCheckedCycleForTxs)
    if (latestCycleCounter - waitCycleForStats > lastCheckedCycleForTxs) {
      StatsFunctions.recordTransactionsStats(latestCycleCounter - waitCycleForStats, lastCheckedCycleForTxs)
      lastCheckedCycleForTxs = latestCycleCounter - waitCycleForStats
    }

    if (latestCycleCounter - waitCycleForStats > lastCheckedCycleForCoinStats) {
      StatsFunctions.recordCoinStats(latestCycleCounter - waitCycleForStats, lastCheckedCycleForCoinStats)
      lastCheckedCycleForCoinStats = latestCycleCounter - waitCycleForStats
    }
  })
}

start()
