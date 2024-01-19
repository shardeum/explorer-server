import WebSocket from 'ws'
import * as dotenv from 'dotenv'
dotenv.config()
import * as Storage from './storage'
import * as cycle from './storage/cycle'
import * as receipt from './storage/receipt'
import * as crypto from '@shardus/crypto-utils'
import * as originalTxData from './storage/originalTxData'
import {
  downloadTxsDataAndCycles,
  compareWithOldReceiptsData,
  compareWithOldCyclesData,
  downloadAndSyncGenesisAccounts,
  needSyncing,
  toggleNeedSyncing,
  downloadReceiptsBetweenCycles,
  compareWithOldOriginalTxsData,
  downloadOriginalTxsDataBetweenCycles,
  queryFromDistributor,
  DataType,
} from './class/DataSync'

import { sleep } from './utils'
import { validateData } from './class/validateData'
import { DistributorSocketCloseCodes } from './types'
import { config as CONFIG, DISTRIBUTOR_URL } from './config'
import { setupCollectorSocketServer } from './logSubscription/CollectorSocketconnection'
// config variables

if (process.env.PORT) {
  CONFIG.port.collector = process.env.PORT
}
let ws: WebSocket
let reconnecting = false
let connected = false

const { hashKey, patchData, verbose, DISTRIBUTOR_RECONNECT_INTERVAL, CONNECT_TO_DISTRIBUTOR_MAX_RETRY } =
  CONFIG

const DistributorFirehoseEvent = 'FIREHOSE'

export const checkAndSyncData = async (): Promise<void> => {
  let lastStoredReceiptCount = await receipt.queryReceiptCount()
  let lastStoredOriginalTxDataCount = await originalTxData.queryOriginalTxDataCount()
  let lastStoredCycleCount = await cycle.queryCycleCount()
  let totalReceiptsToSync = 0
  let totalCyclesToSync = 0
  let totalOriginalTxsToSync = 0
  let lastStoredReceiptCycle = 0
  let lastStoredOriginalTxDataCycle = 0
  const response = await queryFromDistributor(DataType.TOTALDATA, {})
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
  }
}

const attemptReconnection = (): void => {
  console.log(`Re-connecting Distributor in ${DISTRIBUTOR_RECONNECT_INTERVAL / 1000}s...`)
  reconnecting = true
  setTimeout(connectToDistributor, DISTRIBUTOR_RECONNECT_INTERVAL)
}

const connectToDistributor = (): void => {
  const collectorInfo = {
    subscriptionType: DistributorFirehoseEvent,
    timestamp: Date.now(),
  }
  const signedObject = JSON.parse(crypto.stringify({ collectorInfo, sender: CONFIG.collectorInfo.publicKey }))
  crypto.signObj(signedObject, CONFIG.collectorInfo.secretKey, CONFIG.collectorInfo.publicKey)
  const queryString = encodeURIComponent(JSON.stringify(signedObject))
  console.log('--> Query String:', queryString)
  const URL = `${DISTRIBUTOR_URL}?data=${queryString}`
  ws = new WebSocket(URL)

  ws.onopen = () => {
    console.log(`✅ Socket connected to the Distributor @ ${DISTRIBUTOR_URL}`)
    connected = true
    reconnecting = false
  }

  // Listening to FIREHOSE data from the Distributor
  ws.on('message', (data: string) => {
    try {
      if (verbose) console.log('Received FIREHOSE data from Distributor:', data)
      validateData(JSON.parse(data))
    } catch (e) {
      console.log('Error in processing received data!', e)
    }
  })
  ws.onerror = (error) => {
    console.error('Distributor WebSocket error:', error.message)
    reconnecting = false
  }

  // Listening to Socket termination event from the Distributor
  ws.onclose = (closeEvent: WebSocket.CloseEvent) => {
    switch (closeEvent.code) {
      case DistributorSocketCloseCodes.DUPLICATE_CONNECTION_CODE:
        console.log(
          '❌ Socket Connection w/ same client credentials attempted. Dropping existing connection.'
        )
        break
      case DistributorSocketCloseCodes.SUBSCRIBER_EXPIRATION_CODE:
        console.log('❌ Subscription Validity Expired. Connection Terminated.')
        break
      default:
        console.log(`❌ Socket Connection w/ Distributor Terminated with code: ${closeEvent.code}`)
        reconnecting = false
        break
    }
    if (!reconnecting) attemptReconnection()
  }
}

// Setup Log Directory
const start = async (): Promise<void> => {
  let retry = 0
  crypto.init(hashKey)
  await Storage.initializeDB()

  await checkAndSyncData()
  setupCollectorSocketServer()
  try {
    while (!connected) {
      connectToDistributor()
      retry++
      await sleep(DISTRIBUTOR_RECONNECT_INTERVAL)
      if (!connected && retry > CONNECT_TO_DISTRIBUTOR_MAX_RETRY) {
        throw Error(`Cannot connect to the Distributor @ ${DISTRIBUTOR_URL}`)
      }
    }
  } catch (e) {
    console.log(e)
  }
  return
}

start()
