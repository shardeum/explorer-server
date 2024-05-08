import dotenv from 'dotenv'
dotenv.config()

import * as crypto from '@shardus/crypto-utils'
import * as Storage from '../src/storage'
import * as DataSync from '../src/class/DataSync'
import * as StatsStorage from '../src/stats'
import * as StatsFunctions from '../src/class/StatsFunctions'
import { config } from '../src/config'

let startCycle = 0

const cycleNumberToSyncFrom = process.argv[2]
if (cycleNumberToSyncFrom) {
  startCycle = parseInt(cycleNumberToSyncFrom)
}
console.log('Start Cycle', startCycle)

const patchOnlyMissingData = true

// Setup Log Directory
const start = async (): Promise<void> => {
  crypto.init(config.hashKey)
  await Storage.initializeDB()
  await StatsStorage.initializeStatsDB()
  Storage.addExitListeners()

  let totalCyclesToSync = 0
  const response = await DataSync.queryFromDistributor(DataSync.DataType.TOTALDATA, {})
  if (response.data && response.data.totalReceipts >= 0 && response.data.totalCycles >= 0) {
    totalCyclesToSync = response.data.totalCycles
    console.log('totalCyclesToSync', totalCyclesToSync)
  }

  await DataSync.downloadAndSyncGenesisAccounts() // To sync accounts data that are from genesis accounts/accounts data that the network start with

  console.log('startCycle', startCycle, 'totalCyclesToSync', totalCyclesToSync)
  await DataSync.downloadCyclcesBetweenCycles(startCycle, totalCyclesToSync, patchOnlyMissingData)
  console.log('Cycles Patched!')
  await DataSync.downloadReceiptsBetweenCycles(startCycle, totalCyclesToSync, patchOnlyMissingData)
  console.log('Receipts Patched!')
  await DataSync.downloadOriginalTxsDataBetweenCycles(startCycle, totalCyclesToSync, patchOnlyMissingData)
  console.log('OriginalTxs Patched!')

  await StatsFunctions.patchStatsBetweenCycles(startCycle, totalCyclesToSync)
  console.log('Stats Patched!')

  await Storage.closeDatabase()
  console.log('Patching done! from cycle', startCycle, 'to cycle', totalCyclesToSync)
}

start()
