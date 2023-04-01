require('dotenv').config()

import { Collector } from './class/Collector'
import * as ioclient from 'socket.io-client'
import * as crypto from '@shardus/crypto-utils'
import * as Storage from './storage'
import * as archivedCycle from './storage/archivedCycle'
import * as cycle from './storage/cycle'
import * as receipt from './storage/receipt'
import {
  downloadAndInsertArchivedCycles,
  compareWithOldArchivedCyclesData,
  // validateOldArchivedCycleData,
  downloadAndInsertReceiptsAndCycles,
  compareWithOldReceiptsData,
  compareWithOldCyclesData,
  downloadAndSyncGenesisAccounts,
  needSyncing,
  toggleNeedSyncing,
  lastSyncedCycle,
  updateLastSyncedCycle,
} from './class/DataSync'
crypto.init('69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc')

// config variables
import { config as CONFIG, ARCHIVER_URL, config } from './config'
import axios from 'axios'
if (process.env.PORT) {
  CONFIG.port.collector = process.env.PORT
}

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
  txid: string
  ethHash: string
  address: string
  txType: string
  startCycle: string
  start: string
  end: string
  marker: string
  type: string //contract query
}

export const checkAndSyncData = async () => {
  let lastStoredReceiptCount = await receipt.queryReceiptCount()
  let lastStoredCycleCount = await cycle.queryCycleCount()
  let totalReceiptsToSync = 0
  let totalCyclesToSync = 0
  let response = await axios.get(`${ARCHIVER_URL}/totalData`)
  if (response.data && response.data.totalReceipts >= 0 && response.data.totalCycles >= 0) {
    totalReceiptsToSync = response.data.totalReceipts
    totalCyclesToSync = response.data.totalCycles
    console.log('totalReceiptsToSync', totalReceiptsToSync, 'totalCyclesToSync', totalCyclesToSync)
  }
  console.log('lastStoredReceiptCount', lastStoredReceiptCount, 'lastStoredCycleCount', lastStoredCycleCount)
  const patchData = CONFIG.patchData
  // Make sure the data that are store are authentic by comparing 10 last receipts and 10 last cycles
  if (patchData && totalReceiptsToSync > lastStoredReceiptCount && lastStoredReceiptCount > 10) {
    // TODO: update it of comparing receipts of last 10 cycles
    const receiptResult = await compareWithOldReceiptsData(lastStoredReceiptCount)
    if (!receiptResult.success) {
      throw Error(
        'The last saved 10 receipts data does not match with the archiver data! Clear the DB and start the server again!'
      )
    }
    lastStoredReceiptCount = lastStoredReceiptCount - receiptResult.receiptsToMatchCount
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
  if (patchData && lastStoredReceiptCount > 0) {
    if (lastStoredReceiptCount > totalReceiptsToSync) {
      throw Error(
        'The existing db has more data than the network data! Clear the DB and start the server again!'
      )
    }
  }
  if (patchData && totalReceiptsToSync > lastStoredReceiptCount) toggleNeedSyncing()
  if (!needSyncing && totalCyclesToSync > lastStoredCycleCount) toggleNeedSyncing()

  await downloadAndSyncGenesisAccounts() // To sync accounts data that are from genesis accounts/accounts data that the network start with

  if (needSyncing) {
    console.log(lastStoredReceiptCount, totalReceiptsToSync, lastStoredCycleCount, totalCyclesToSync)
    await downloadAndInsertReceiptsAndCycles(
      totalReceiptsToSync,
      lastStoredReceiptCount,
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
const start = async () => {
  await Storage.initializeDB()

  const collector = new Collector()

  if (CONFIG.experimentalSnapshot) {
    await checkAndSyncData()
    try {
      const socketClient = ioclient.connect(ARCHIVER_URL)
      socketClient.on('connect', () => {
        console.log('connected to archive server')
      })

      socketClient.on('RECEIPT', async (data: any) => {
        // console.log('RECEIVED RECEIPT')
        try {
          collector.processReceipt(data)
        } catch (e) {
          console.log('Error in processing received data!', e)
        }
      })
    } catch (e) {
      console.log(e)
    }
    return
  }

  let lastStoredCycles = await archivedCycle.queryAllArchivedCycles(1)
  let lastStoredCycleCounter = 0
  let lastestCycleToSync = 0
  let response = await axios.get(`${ARCHIVER_URL}/full-archive/1`)
  if (response.data && response.data.archivedCycles && response.data.archivedCycles.length > 0) {
    lastestCycleToSync = response.data.archivedCycles[0].cycleRecord.counter
    console.log('lastestCycleToSync', lastestCycleToSync)
  }
  if (lastStoredCycles.length > 0 && lastStoredCycles[0].counter > 20 && lastestCycleToSync > 20) {
    lastStoredCycleCounter = lastStoredCycles[0].counter
    console.log('lastStoredCycleNumber', lastStoredCycleCounter)
    // Make sure the data that are store are authentic by comparing 20 last cycles
    const result = await compareWithOldArchivedCyclesData(lastStoredCycleCounter)
    if (!result.success) {
      throw Error(
        'The last saved 20 cycles data does not match with the archiver data! Clear the DB and start the server again!'
      )
    }

    lastStoredCycleCounter = result.cycle
  } else if (lastStoredCycles.length > 0) {
    lastStoredCycleCounter = lastStoredCycles[0].counter
    if (lastStoredCycleCounter > lastSyncedCycle) {
      throw Error(
        'The existing db has more data than the network data! Clear the DB and start the server again!'
      )
    }
  }
  if (lastestCycleToSync > lastStoredCycleCounter) toggleNeedSyncing()

  // await validateOldArchivedCycleData(lastStoredCycleCounter);

  if (needSyncing) {
    console.log(lastestCycleToSync, lastStoredCycleCounter)
    await downloadAndInsertArchivedCycles(lastestCycleToSync, lastStoredCycleCounter)
    toggleNeedSyncing() // data is synced now
  }

  // lastStoredCycles = await archivedCycle.queryAllArchivedCycles(1);
  // if (lastStoredCycles.length > 0) {
  //   lastSyncedCycle = lastStoredCycles[0].counter - 20;
  //   if (lastSyncedCycle < 0) {
  //     lastSyncedCycle = 0;
  //   }
  //   console.log('lastSyncedCycle', lastSyncedCycle);
  // }

  const socketClient = ioclient.connect(ARCHIVER_URL)

  socketClient.on('connect', () => {
    console.log('connected to archive server')
  })

  socketClient.on('ARCHIVED_CYCLE', async (data: any) => {
    console.log(
      'RECEIVED ARCHIVED_CYCLE',
      data.archivedCycles &&
        data.archivedCycles[0] &&
        data.archivedCycles[0].cycleRecord &&
        data.archivedCycles[0].cycleRecord.counter
    )
    try {
      collector.processData(data)
    } catch (e) {
      console.log('Error in processing received data!', e)
    }
  })
}
start()
