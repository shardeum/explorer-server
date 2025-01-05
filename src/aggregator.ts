// require("dotenv").config();

import * as crypto from '@shardeum-foundation/lib-crypto-utils'
import cron from 'node-cron'
import * as StatsStorage from './stats'
import * as CoinStats from './stats/coinStats'
import * as TransactionStats from './stats/transactionStats'
import * as ValidatorStats from './stats/validatorStats'
import * as Metadata from './stats/metadata'
import * as Storage from './storage'
import * as Cycle from './storage/cycle'
import * as StatsFunctions from './class/StatsFunctions'
import { Utils as StringUtils } from '@shardeum-foundation/lib-types'
// import { config } from './config/index'

crypto.init('69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')
crypto.setCustomStringifier(StringUtils.safeStringify, 'shardus_safeStringify')

// config variables
import { config as CONFIG } from './config'
if (process.env.PORT) {
  CONFIG.port.server = process.env.PORT
}

const measure_time = false
let start_time

const start = async (): Promise<void> => {
  await Storage.initializeDB()

  await StatsStorage.initializeStatsDB()
  Storage.addExitListeners()
  let lastCheckedCycleForValidators = -1
  let lastCheckedCycleForTxs = -1
  let lastCheckedCycleForCoinStats = -1

  const waitCycleForStats = 5 // Calculate transactions count per Cycle after 5 cycles

  const lastStoredValidators = await ValidatorStats.queryLatestValidatorStats(1)
  if (lastStoredValidators.length > 0) lastCheckedCycleForValidators = lastStoredValidators[0].cycle

  const lastStoredTransactions = await TransactionStats.queryLatestTransactionStats(1)
  if (lastStoredTransactions.length > 0) lastCheckedCycleForTxs = lastStoredTransactions[0].cycle

  const lastStoredCoinStats = await CoinStats.queryLatestCoinStats(1)
  if (lastStoredCoinStats.length > 0) lastCheckedCycleForCoinStats = lastStoredCoinStats[0].cycle

  let lastCheckedCycleForNodeStats = await Metadata.getLastStoredCycleNumber(Metadata.MetadataType.NodeStats)
  console.log('lastCheckedCycleForNodeStats', lastCheckedCycleForNodeStats)

  console.log('lastCheckedCycleForValidators', lastCheckedCycleForValidators)
  if (measure_time) start_time = process.hrtime()
  cron.schedule('* * * * *', async () => {
    console.log('Running cron task....')
    if (measure_time && start_time) {
      const end_time = process.hrtime(start_time)
      console.log('End Time', end_time)
      start_time = process.hrtime()
    }
    const latestCycleRecord = await Cycle.queryLatestCycleRecords(1)
    const latestCycleCounter = latestCycleRecord.length > 0 ? latestCycleRecord[0].counter : 0
    console.log('latestCycleCounter', latestCycleCounter)
    if (latestCycleCounter > lastCheckedCycleForValidators) {
      if (latestCycleCounter - lastCheckedCycleForValidators === 1)
        await StatsFunctions.insertValidatorStats(latestCycleRecord[0].cycleRecord)
      else StatsFunctions.recordOldValidatorsStats(latestCycleCounter, lastCheckedCycleForValidators)
      lastCheckedCycleForValidators = latestCycleCounter
    }
    // /* prettier-ignore */ if (config.verbose)  console.log(latestCycleCounter - waitCycleForTxs, lastCheckedCycleForTxs)
    if (latestCycleCounter - waitCycleForStats > lastCheckedCycleForTxs) {
      StatsFunctions.recordTransactionsStats(latestCycleCounter - waitCycleForStats, lastCheckedCycleForTxs)
      lastCheckedCycleForTxs = latestCycleCounter - waitCycleForStats
    }

    if (latestCycleCounter - waitCycleForStats > lastCheckedCycleForCoinStats) {
      StatsFunctions.recordCoinStats(latestCycleCounter - waitCycleForStats, lastCheckedCycleForCoinStats)
      lastCheckedCycleForCoinStats = latestCycleCounter - waitCycleForStats
    }

    if (latestCycleCounter > lastCheckedCycleForNodeStats) {
      await StatsFunctions.recordNodeStats(latestCycleCounter, lastCheckedCycleForNodeStats)
      lastCheckedCycleForNodeStats = latestCycleCounter
      StatsFunctions.insertOrUpdateMetadata(Metadata.MetadataType.NodeStats, lastCheckedCycleForNodeStats)
    }
  })
}

start()
