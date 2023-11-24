import * as dotenv from 'dotenv'
dotenv.config()

import { Data, validateData } from './class/validateData'
import * as ioclient from 'socket.io-client'
import * as Storage from './storage'
import * as cycle from './storage/cycle'
import * as receipt from './storage/receipt'
import * as originalTxData from './storage/originalTxData'
import {
  downloadTxsDataAndCycles,
  compareWithOldReceiptsData,
  compareWithOldCyclesData,
  downloadAndSyncGenesisAccounts,
  needSyncing,
  toggleNeedSyncing,
  updateLastSyncedCycle,
  downloadReceiptsBetweenCycles,
  compareWithOldOriginalTxsData,
  downloadOriginalTxsDataBetweenCycles,
} from './class/DataSync'
import { setupCollectorSocketServer } from './logSubscription/CollectorSocketconnection'

// config variables
import { config as CONFIG } from './config'
import axios from 'axios'
import { getDefaultArchiverUrl } from './archiver'
if (process.env.PORT) {
  CONFIG.port.collector = process.env.PORT
}

const ArchiverReceiptWsEvent = 'RECEIPT'

export const checkAndSyncData = async (): Promise<void> => {
  let lastStoredReceiptCount = await receipt.queryReceiptCount()
  let lastStoredOriginalTxDataCount = await originalTxData.queryOriginalTxDataCount()
  let lastStoredCycleCount = await cycle.queryCycleCount()
  let totalReceiptsToSync = 0
  let totalCyclesToSync = 0
  let totalOriginalTxsToSync = 0
  let lastStoredReceiptCycle = 0
  let lastStoredOriginalTxDataCycle = 0
  const archiverUrl = await getDefaultArchiverUrl()
  const response = await axios.get(`${archiverUrl}/totalData`)
  if (
    response.data &&
    response.data.totalReceipts >= 0 &&
    response.data.totalCycles >= 0 &&
    response.data.totalOriginalTxs >= 0
  ) {
    totalReceiptsToSync = response.data.totalReceipts
    totalCyclesToSync = response.data.totalCycles
    totalOriginalTxsToSync = response.data.totalOriginalTxs
    console.log(
      'totalReceiptsToSync',
      totalReceiptsToSync,
      'totalCyclesToSync',
      totalCyclesToSync,
      'totalOriginalTxsToSync',
      totalOriginalTxsToSync
    )
  }
  console.log(
    'lastStoredReceiptCount',
    lastStoredReceiptCount,
    'lastStoredCycleCount',
    lastStoredCycleCount,
    'lastStoredOriginalTxDataCount',
    lastStoredOriginalTxDataCount
  )
  const patchData = CONFIG.patchData
  // Make sure the data that saved are authentic by comparing receipts count of last 10 cycles for receipts data, originalTxs count of last 10 cycles for originalTxData data and 10 last cycles for cycles data
  if (patchData && lastStoredReceiptCount > 0) {
    const lastStoredReceiptInfo = await receipt.queryLatestReceipts(1)
    if (lastStoredReceiptInfo && lastStoredReceiptInfo.length > 0)
      lastStoredReceiptCycle = lastStoredReceiptInfo[0].cycle
    const receiptResult = await compareWithOldReceiptsData(lastStoredReceiptCycle)
    if (!receiptResult.success) {
      throw Error(
        'The last saved receipts of last 10 cycles data do not match with the archiver data! Clear the DB and start the server again!'
      )
    }
    lastStoredReceiptCycle = receiptResult.matchedCycle
  }
  if (patchData && lastStoredOriginalTxDataCount > 0) {
    const lastStoredOriginalTxDataInfo = await originalTxData.queryOriginalTxsData(1)
    if (lastStoredOriginalTxDataInfo && lastStoredOriginalTxDataInfo.length > 0)
      lastStoredOriginalTxDataCycle = lastStoredOriginalTxDataInfo[0].cycle
    const originalTxResult = await compareWithOldOriginalTxsData(lastStoredOriginalTxDataCycle)
    if (!originalTxResult.success) {
      throw Error(
        'The last saved originalTxsData of last 10 cycles data do not match with the archiver data! Clear the DB and start the server again!'
      )
    }
    lastStoredOriginalTxDataCycle = originalTxResult.matchedCycle
  }
  if (totalCyclesToSync > lastStoredCycleCount && lastStoredCycleCount > 10) {
    const cycleResult = await compareWithOldCyclesData(lastStoredCycleCount)
    if (!cycleResult.success) {
      throw Error(
        'The last saved 10 cycles data does not match with the archiver data! Clear the DB and start the server again!'
      )
    }

    lastStoredCycleCount = cycleResult.cycle
  }
  if (patchData && (lastStoredReceiptCount > 0 || lastStoredOriginalTxDataCount > 0)) {
    if (lastStoredReceiptCount > totalReceiptsToSync) {
      throw Error(
        'The existing db has more receipts data than the network data! Clear the DB and start the server again!'
      )
    }
    if (lastStoredOriginalTxDataCount > totalOriginalTxsToSync) {
      throw Error(
        'The existing db has more originalTxsData data than the network data! Clear the DB and start the server again!'
      )
    }
  }
  if (patchData && totalReceiptsToSync > lastStoredReceiptCount) toggleNeedSyncing()
  if (patchData && totalOriginalTxsToSync > lastStoredOriginalTxDataCount) toggleNeedSyncing()
  if (!needSyncing && totalCyclesToSync > lastStoredCycleCount) toggleNeedSyncing()

  await downloadAndSyncGenesisAccounts() // To sync accounts data that are from genesis accounts/accounts data that the network start with

  if (needSyncing) {
    console.log(
      lastStoredReceiptCount,
      totalReceiptsToSync,
      lastStoredCycleCount,
      totalCyclesToSync,
      lastStoredOriginalTxDataCount,
      totalOriginalTxsToSync
    )
    // Sync receipts and originalTxsData data first if there is old data
    if (lastStoredReceiptCycle > 0 && totalCyclesToSync > lastStoredReceiptCycle) {
      await downloadReceiptsBetweenCycles(lastStoredReceiptCycle, totalCyclesToSync)
      lastStoredReceiptCount = await receipt.queryReceiptCount()
    }
    if (lastStoredOriginalTxDataCycle > 0 && totalCyclesToSync > lastStoredOriginalTxDataCycle) {
      await downloadOriginalTxsDataBetweenCycles(lastStoredOriginalTxDataCycle, totalCyclesToSync)
      lastStoredOriginalTxDataCount = await originalTxData.queryOriginalTxDataCount()
    }
    await downloadTxsDataAndCycles(
      totalReceiptsToSync,
      lastStoredReceiptCount,
      totalOriginalTxsToSync,
      lastStoredOriginalTxDataCount,
      totalCyclesToSync,
      lastStoredCycleCount
    )
    toggleNeedSyncing()
    let lastSyncedCycle = totalCyclesToSync - 5
    if (lastSyncedCycle < -1) lastSyncedCycle = 0
    updateLastSyncedCycle(lastSyncedCycle)
  }
}

// Setup Log Directory
const start = async (): Promise<void> => {
  await Storage.initializeDB()
  const archiverUrl = await getDefaultArchiverUrl()

  await checkAndSyncData()
  setupCollectorSocketServer()
  try {
    const socketClient = ioclient.connect(archiverUrl)
    socketClient.on('connect', () => {
      console.log('connected to archive server')
    })

    socketClient.on(ArchiverReceiptWsEvent, async (data: Data) => {
      // console.log('RECEIVED RECEIPT')
      try {
        validateData(data)
      } catch (e) {
        console.log('Error in processing received data!', e)
      }
    })
  } catch (e) {
    console.log(e)
  }
  return
}

start()
