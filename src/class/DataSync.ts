import axios from 'axios'
import * as Account from '../storage/account'
import * as Transaction from '../storage/transaction'
import * as Cycle from '../storage/cycle'
import * as Receipt from '../storage/receipt'
import * as OriginalTxData from '../storage/originalTxData'
import { config, DISTRIBUTOR_URL } from '../config'
import * as crypto from '@shardus/crypto-utils'
import { Cycle as CycleType } from '../types/cycle'
import { Utils as StringUtils } from '@shardus/types'

export let needSyncing = false

const MAX_RECEIPTS_PER_REQUEST = 100
const MAX_ORIGINAL_TXS_PER_REQUEST = 100
const MAX_CYCLES_PER_REQUEST = 100
const MAX_ACCOUNTS_PER_REQUEST = 100

const MAX_BETWEEN_CYCLES_PER_REQUEST = 100

export const toggleNeedSyncing = (): void => {
  needSyncing = !needSyncing
  if (config.verbose) console.log('needSyncing', needSyncing)
}

export enum DataType {
  CYCLE = 'cycleinfo',
  RECEIPT = 'receipt',
  ORIGINALTX = 'originalTx',
  ACCOUNT = 'account',
  TRANSACTION = 'transaction',
  TOTALDATA = 'totalData',
}

export const queryFromDistributor = async (type: DataType, queryParameters: any): Promise<any> => {
  const data = {
    ...queryParameters,
    sender: config.collectorInfo.publicKey,
  }
  crypto.signObj(data, config.collectorInfo.secretKey, config.collectorInfo.publicKey)
  let url
  switch (type) {
    case DataType.CYCLE:
      url = `${DISTRIBUTOR_URL}/cycleinfo`
      break
    case DataType.RECEIPT:
      url = `${DISTRIBUTOR_URL}/receipt`
      break
    case DataType.ORIGINALTX:
      url = `${DISTRIBUTOR_URL}/originalTx`
      break
    case DataType.ACCOUNT:
      url = `${DISTRIBUTOR_URL}/account`
      break
    case DataType.TRANSACTION:
      url = `${DISTRIBUTOR_URL}/transaction`
      break
    case DataType.TOTALDATA:
      url = `${DISTRIBUTOR_URL}/totalData`
      break
  }
  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })
    return response
  } catch (e) {
    console.log(`Error while querying ${url} for data ${data}`, e)
    return null
  }
}

export async function compareWithOldReceiptsData(
  lastStoredReceiptCycle = 0
): Promise<{ success: boolean; matchedCycle: number }> {
  const numberOfCyclesTocompare = 10
  const endCycle = lastStoredReceiptCycle
  const startCycle = endCycle - numberOfCyclesTocompare > 0 ? endCycle - numberOfCyclesTocompare : 0
  let downloadedReceiptCountByCycles: { cycle: number; receipts: number }[]
  const response = await queryFromDistributor(DataType.RECEIPT, { startCycle, endCycle, type: 'tally' })
  if (response && response.data && response.data.receipts) {
    downloadedReceiptCountByCycles = response.data.receipts
  } else {
    throw Error(
      `Can't fetch receipts data from cycle ${startCycle} to cycle ${endCycle}  from distributor ${DISTRIBUTOR_URL}`
    )
  }
  const oldReceiptCountByCycle = await Receipt.queryReceiptCountByCycles(startCycle, endCycle)
  let success = false
  let matchedCycle = 0
  for (let i = 0; i < downloadedReceiptCountByCycles.length; i++) {
    /* eslint-disable security/detect-object-injection */
    const downloadedReceipt = downloadedReceiptCountByCycles[i]
    const oldReceipt = oldReceiptCountByCycle[i]
    /* eslint-enable security/detect-object-injection */
    console.log(downloadedReceipt, oldReceipt)
    if (downloadedReceipt.cycle !== oldReceipt.cycle || downloadedReceipt.receipts !== oldReceipt.receipts) {
      return {
        success,
        matchedCycle,
      }
    }
    success = true
    matchedCycle = downloadedReceipt.cycle
  }
  success = true
  return { success, matchedCycle }
}

export async function compareWithOldOriginalTxsData(
  lastStoredOriginalTxDataCycle = 0
): Promise<{ success: boolean; matchedCycle: number }> {
  const numberOfCyclesTocompare = 10
  const endCycle = lastStoredOriginalTxDataCycle
  const startCycle = endCycle - numberOfCyclesTocompare > 0 ? endCycle - numberOfCyclesTocompare : 0
  let downloadedOriginalTxDataCountByCycles: { cycle: number; originalTxsData: number }[]
  const response = await queryFromDistributor(DataType.ORIGINALTX, { startCycle, endCycle, type: 'tally' })
  if (response && response.data && response.data.originalTxs) {
    downloadedOriginalTxDataCountByCycles = response.data.originalTxs
  } else {
    throw Error(
      `Can't fetch originalTxsData data from cycle ${startCycle} to cycle ${endCycle}  from distributor ${DISTRIBUTOR_URL}`
    )
  }
  const oldOriginalTxDataCountByCycle = await OriginalTxData.queryOriginalTxDataCountByCycles(
    startCycle,
    endCycle
  )
  let success = false
  let matchedCycle = 0
  for (let i = 0; i < downloadedOriginalTxDataCountByCycles.length; i++) {
    /* eslint-disable security/detect-object-injection */
    const downloadedOriginalTxData = downloadedOriginalTxDataCountByCycles[i]
    const oldOriginalTxData = oldOriginalTxDataCountByCycle[i]
    /* eslint-enable security/detect-object-injection */
    console.log(downloadedOriginalTxData, oldOriginalTxData)
    if (
      downloadedOriginalTxData.cycle !== oldOriginalTxData.cycle ||
      downloadedOriginalTxData.originalTxsData !== oldOriginalTxData.originalTxsData
    ) {
      return {
        success,
        matchedCycle,
      }
    }
    success = true
    matchedCycle = downloadedOriginalTxData.cycle
  }
  success = true
  return { success, matchedCycle }
}

export const compareWithOldCyclesData = async (
  lastCycleCounter: number
): Promise<{ success: boolean; cycle: number }> => {
  let downloadedCycles: CycleType[]

  const numberOfCyclesTocompare = 10
  const response = await queryFromDistributor(DataType.CYCLE, {
    start: lastCycleCounter - numberOfCyclesTocompare,
    end: lastCycleCounter - 1,
  })
  if (response && response.data && response.data.cycleInfo) {
    downloadedCycles = response.data.cycleInfo
  } else {
    throw Error(
      `Can't fetch data from cycle ${
        lastCycleCounter - numberOfCyclesTocompare
      } to cycle ${lastCycleCounter}  from archiver server`
    )
  }
  const oldCycles = await Cycle.queryCycleRecordsBetween(
    lastCycleCounter - numberOfCyclesTocompare,
    lastCycleCounter + 1
  )
  downloadedCycles.sort((a, b) => (a.counter > b.counter ? 1 : -1))
  oldCycles.sort((a: { cycleRecord: { counter: number } }, b: { cycleRecord: { counter: number } }) =>
    a.cycleRecord.counter > b.cycleRecord.counter ? 1 : -1
  )
  let success = false
  let cycle = 0
  for (let i = 0; i < downloadedCycles.length; i++) {
    /* eslint-disable security/detect-object-injection */
    const downloadedCycle = downloadedCycles[i]
    const oldCycle = oldCycles[i]
    /* eslint-enable security/detect-object-injection */
    console.log(downloadedCycle.counter, oldCycle.cycleRecord.counter)
    if (StringUtils.safeStringify(downloadedCycle) !== StringUtils.safeStringify(oldCycle.cycleRecord)) {
      return {
        success,
        cycle,
      }
    }
    success = true
    cycle = downloadedCycle.counter
  }
  return { success, cycle }
}

export const downloadTxsDataAndCycles = async (
  totalReceiptsToSync: number,
  fromReceipt = 0,
  totalOriginalTxsToSync: number,
  fromOriginalTxData = 0,
  totalCyclesToSync: number,
  fromCycle = 0
): Promise<void> => {
  let completeForReceipt = false
  let completeForCycle = false
  let completeForOriginalTxData = false
  let startReceipt = fromReceipt
  let startCycle = fromCycle
  let startOriginalTxData = fromOriginalTxData
  let endReceipt = startReceipt + MAX_RECEIPTS_PER_REQUEST
  let endCycle = startCycle + MAX_CYCLES_PER_REQUEST
  let endOriginalTxData = startOriginalTxData + MAX_ORIGINAL_TXS_PER_REQUEST
  let patchData = config.patchData
  if (startReceipt === 0 || startOriginalTxData === 0) patchData = true // This means we don't have any data yet, so sync txs data as well
  if (!patchData) {
    completeForReceipt = true
    completeForOriginalTxData = true
  }
  while (!completeForReceipt || !completeForCycle || !completeForOriginalTxData) {
    if (
      endReceipt >= totalReceiptsToSync ||
      endCycle >= totalCyclesToSync ||
      endOriginalTxData >= totalOriginalTxsToSync
    ) {
      const res = await queryFromDistributor(DataType.TOTALDATA, {})
      if (res.data && res.data.totalCycles && res.data.totalReceipts) {
        if (totalReceiptsToSync < res.data.totalReceipts) {
          completeForReceipt = false
          totalReceiptsToSync = res.data.totalReceipts
        }
        if (totalOriginalTxsToSync < res.data.totalOriginalTxs) {
          completeForOriginalTxData = false
          totalOriginalTxsToSync = res.data.totalOriginalTxs
        }
        if (totalCyclesToSync < res.data.totalCycles) {
          completeForCycle = false
          totalCyclesToSync = res.data.totalCycles
        }
        if (!patchData) {
          completeForReceipt = true
          completeForOriginalTxData = true
        }
        console.log(
          'totalReceiptsToSync',
          totalReceiptsToSync,
          'totalCyclesToSync',
          totalCyclesToSync,
          'totalOriginalTxsToSync',
          totalOriginalTxsToSync
        )
      }
    }
    if (!completeForReceipt) {
      console.log(`Downloading receipts from ${startReceipt} to ${endReceipt}`)
      const response = await queryFromDistributor(DataType.RECEIPT, { start: startReceipt, end: endReceipt })
      if (response && response.data && response.data.receipts) {
        console.log(`Downloaded receipts`, response.data.receipts.length)
        await Receipt.processReceiptData(response.data.receipts)
        if (response.data.receipts.length < MAX_RECEIPTS_PER_REQUEST) {
          completeForReceipt = true
          startReceipt += response.data.receipts.length
          endReceipt = startReceipt + MAX_RECEIPTS_PER_REQUEST
          console.log('Download completed for receipts')
        } else {
          startReceipt = endReceipt + 1
          endReceipt += MAX_RECEIPTS_PER_REQUEST
        }
      } else {
        console.log('Receipt', 'Invalid download response', startReceipt, endReceipt)
      }
    }
    if (!completeForOriginalTxData) {
      console.log(`Downloading originalTxsData from ${startOriginalTxData} to ${endOriginalTxData}`)
      const response = await queryFromDistributor(DataType.ORIGINALTX, {
        start: startOriginalTxData,
        end: endOriginalTxData,
      })
      if (response && response.data && response.data.originalTxs) {
        console.log(`Downloaded originalTxsData`, response.data.originalTxs.length)
        await OriginalTxData.processOriginalTxData(response.data.originalTxs)
        if (response.data.originalTxs.length < MAX_ORIGINAL_TXS_PER_REQUEST) {
          completeForOriginalTxData = true
          startOriginalTxData += response.data.originalTxs.length
          endOriginalTxData = startOriginalTxData + MAX_ORIGINAL_TXS_PER_REQUEST
          console.log('Download completed for originalTxsData')
        } else {
          startOriginalTxData = endOriginalTxData + 1
          endOriginalTxData += MAX_ORIGINAL_TXS_PER_REQUEST
        }
      } else {
        console.log('OriginalTxData', 'Invalid download response', startOriginalTxData, endOriginalTxData)
      }
    }
    if (!completeForCycle) {
      console.log(`Downloading cycles from ${startCycle} to ${endCycle}`)
      const response = await queryFromDistributor(DataType.CYCLE, { start: startCycle, end: endCycle })
      if (response && response.data && response.data.cycleInfo) {
        console.log(`Downloaded cycles`, response.data.cycleInfo.length)
        const cycles = response.data.cycleInfo
        let combineCycles = []
        for (let i = 0; i < cycles.length; i++) {
          // eslint-disable-next-line security/detect-object-injection
          const cycle = cycles[i]
          if (!cycle.marker || cycle.counter < 0) {
            console.log('Invalid Cycle Received', cycle)
            continue
          }
          const cycleObj = {
            counter: cycle.counter,
            cycleRecord: cycle,
            cycleMarker: cycle.marker,
          }
          combineCycles.push(cycleObj)
          // await Cycle.insertOrUpdateCycle(cycleObj);
          if (combineCycles.length >= MAX_CYCLES_PER_REQUEST || i === cycles.length - 1) {
            await Cycle.bulkInsertCycles(combineCycles)
            combineCycles = []
          }
        }
        if (response.data.cycleInfo.length < MAX_CYCLES_PER_REQUEST) {
          completeForCycle = true
          startCycle += response.data.cycleInfo.length
          endCycle = startCycle + MAX_CYCLES_PER_REQUEST
          console.log('Download completed for cycles')
        } else {
          startCycle = endCycle + 1
          endCycle += MAX_CYCLES_PER_REQUEST
        }
      } else {
        console.log('Cycle', 'Invalid download response', startCycle, endCycle)
      }
    }
  }
  console.log('Sync Cycle and Txs data completed!')
}

export const downloadAndSyncGenesisAccounts = async (): Promise<void> => {
  let completeSyncingAccounts = false
  let completeSyncTransactions = false
  let startAccount = 0
  let endAccount = startAccount + MAX_ACCOUNTS_PER_REQUEST
  let startTransaction = 0
  let endTransaction = startTransaction + MAX_ACCOUNTS_PER_REQUEST
  let combineTransactions = []

  let totalGenesisAccounts = 0
  let totalGenesisTransactionReceipts = 0
  const totalExistingGenesisAccounts = await Account.queryAccountCountBetweenCycles(0, 5)
  const totalExistingGenesisTransactionReceipts = await Transaction.queryTransactionCountBetweenCycles(0, 5)
  if (totalExistingGenesisAccounts > 0 && totalExistingGenesisTransactionReceipts > 0) {
    // Let's assume it has synced data for now, update to sync account count between them
    return
  }

  if (totalExistingGenesisAccounts === 0) {
    const res = await queryFromDistributor(DataType.ACCOUNT, { startCycle: 0, endCycle: 5 })
    if (res && res.data && res.data.totalAccounts) {
      totalGenesisAccounts = res.data.totalAccounts
    } else {
      console.log('Genesis Account', 'Invalid download response')
      return
    }
    if (totalGenesisAccounts <= 0) return
    let page = 1
    while (!completeSyncingAccounts) {
      console.log(`Downloading accounts from ${startAccount} to ${endAccount}`)
      const response = await queryFromDistributor(DataType.ACCOUNT, { startCycle: 0, endCycle: 5, page })
      if (response && response.data && response.data.accounts) {
        if (response.data.accounts.length < MAX_ACCOUNTS_PER_REQUEST) {
          completeSyncingAccounts = true
          console.log('Download completed for accounts')
        }
        console.log(`Downloaded accounts`, response.data.accounts.length)
        const transactions = await Account.processAccountData(response.data.accounts)
        combineTransactions = [...combineTransactions, ...transactions]
      } else {
        console.log('Genesis Account', 'Invalid download response')
      }
      startAccount = endAccount
      endAccount += MAX_ACCOUNTS_PER_REQUEST
      page++
      // await sleep(1000);
    }
    await Transaction.processTransactionData(combineTransactions)
  }
  if (totalExistingGenesisTransactionReceipts === 0) {
    const res = await queryFromDistributor(DataType.TRANSACTION, { startCycle: 0, endCycle: 5 })
    if (res && res.data && res.data.totalTransactions) {
      totalGenesisTransactionReceipts = res.data.totalTransactions
    } else {
      console.log('Genesis Transaction Receipt', 'Invalid download response')
      return
    }
    if (totalGenesisTransactionReceipts <= 0) return
    let page = 1
    while (!completeSyncTransactions) {
      console.log(`Downloading transactions from ${startTransaction} to ${endTransaction}`)
      const response = await queryFromDistributor(DataType.TRANSACTION, { startCycle: 0, endCycle: 5, page })
      if (response && response.data && response.data.transactions) {
        if (response.data.transactions.length < MAX_ACCOUNTS_PER_REQUEST) {
          completeSyncTransactions = true
          console.log('Download completed for transactions')
        }
        console.log(`Downloaded transactions`, response.data.transactions.length)
        await Transaction.processTransactionData(response.data.transactions)
      } else {
        console.log('Genesis Transaction Receipt', 'Invalid download response')
      }
      startTransaction = endTransaction
      endTransaction += MAX_ACCOUNTS_PER_REQUEST
      page++
    }
  }
  console.log('Sync Genesis accounts and transaction receipts completed!')
}

// TODO: We can have compareWithOldReceiptsData and compareReceiptsCountByCycles to be the same function, needs a bit of refactor
export async function compareReceiptsCountByCycles(
  startCycle: number,
  endCycle: number
): Promise<{ cycle: number; receipts: number }[]> {
  const unMatchedCycle = []
  let downloadedReceiptCountByCycle: { cycle: number; receipts: number }[]
  const response = await queryFromDistributor(DataType.RECEIPT, { startCycle, endCycle, type: 'tally' })
  if (response && response.data && response.data.receipts) {
    downloadedReceiptCountByCycle = response.data.receipts
  } else {
    console.log(
      `Can't fetch receipts count between cycle ${startCycle} and cycle ${endCycle} from distributor ${DISTRIBUTOR_URL}`
    )
    return
  }
  const existingReceiptCountByCycle = await Receipt.queryReceiptCountByCycles(startCycle, endCycle)
  if (config.verbose) console.log('downloadedReceiptCountByCycle', downloadedReceiptCountByCycle)
  if (config.verbose) console.log('existingReceiptCountByCycle', existingReceiptCountByCycle)
  for (const downloadedReceipt of downloadedReceiptCountByCycle) {
    const existingReceipt = existingReceiptCountByCycle.find(
      (rc: { cycle: number }) => rc.cycle === downloadedReceipt.cycle
    )
    if (config.verbose) console.log(downloadedReceipt, existingReceipt)
    if (existingReceipt) {
      if (downloadedReceipt.receipts !== existingReceipt.receipts) {
        unMatchedCycle.push(downloadedReceipt)
      }
    } else unMatchedCycle.push(downloadedReceipt)
  }
  return unMatchedCycle
}

// TODO: We can have compareWithOriginalTxsData and compareOriginalTxsCountByCycles to be the same function, needs a bit of refactor
export async function compareOriginalTxsCountByCycles(
  startCycle: number,
  endCycle: number
): Promise<{ cycle: number; originalTxsData: number }[]> {
  const unMatchedCycle = []
  let downloadedOriginalTxDataCountByCycle: { cycle: number; originalTxsData: number }[]
  const response = await queryFromDistributor(DataType.ORIGINALTX, { startCycle, endCycle, type: 'tally' })
  if (response && response.data && response.data.originalTxs) {
    downloadedOriginalTxDataCountByCycle = response.data.originalTxs
  } else {
    console.log(
      `Can't fetch originalTxs count between cycle ${startCycle} and cycle ${endCycle} from distributor ${DISTRIBUTOR_URL}`
    )
    return
  }
  const existingOriginalTxDataCountByCycle = await OriginalTxData.queryOriginalTxDataCountByCycles(
    startCycle,
    endCycle
  )
  if (config.verbose)
    console.log('downloadedOriginalTxDataCountByCycle', downloadedOriginalTxDataCountByCycle)
  if (config.verbose) console.log('existingOriginalTxDataCountByCycle', existingOriginalTxDataCountByCycle)
  for (const downloadedOriginalTxData of downloadedOriginalTxDataCountByCycle) {
    const existingOriginalTxData = existingOriginalTxDataCountByCycle.find(
      (rc: { cycle: number }) => rc.cycle === downloadedOriginalTxData.cycle
    )
    if (config.verbose) console.log(downloadedOriginalTxData, existingOriginalTxData)
    if (existingOriginalTxData) {
      if (downloadedOriginalTxData.originalTxsData !== existingOriginalTxData.originalTxsData) {
        unMatchedCycle.push(downloadedOriginalTxData)
      }
    } else unMatchedCycle.push(downloadedOriginalTxData)
  }
  return unMatchedCycle
}

export async function downloadReceiptsByCycle(
  data: { cycle: number; receipts: number }[] = []
): Promise<void> {
  for (const { cycle, receipts } of data) {
    let page = 1
    let totalDownloadedReceipts = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await queryFromDistributor(DataType.RECEIPT, {
        startCycle: cycle,
        endCycle: cycle,
        page,
      })
      if (response && response.data && response.data.receipts) {
        const downloadedReceipts = response.data.receipts
        if (downloadedReceipts.length > 0) {
          totalDownloadedReceipts += downloadedReceipts.length
          await Receipt.processReceiptData(downloadedReceipts)
        } else {
          console.log(
            `Got 0 receipts when querying for page ${page} of cycle ${cycle} from distributor ${DISTRIBUTOR_URL}`
          )
          break
        }
        page++
        if (config.verbose) console.log('totalDownloadedReceipts', totalDownloadedReceipts, receipts)
        if (totalDownloadedReceipts === receipts) {
          console.log('totalDownloadedReceipts for cycle', cycle, totalDownloadedReceipts)
          break
        }
      } else {
        console.log(
          `Can't fetch receipts for  page ${page} of cycle ${cycle} from distributor ${DISTRIBUTOR_URL}`
        )
        break
      }
    }
  }
}

export async function downloadOriginalTxsDataByCycle(
  data: { cycle: number; originalTxsData: number }[] = []
): Promise<void> {
  for (const { cycle, originalTxsData } of data) {
    let page = 1
    let totalDownloadOriginalTxsData = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await queryFromDistributor(DataType.ORIGINALTX, {
        startCycle: cycle,
        endCycle: cycle,
        page,
      })
      if (response && response.data && response.data.originalTxs) {
        const downloadedOriginalTxsData = response.data.originalTxs
        if (downloadedOriginalTxsData.length > 0) {
          totalDownloadOriginalTxsData += downloadedOriginalTxsData.length
          await OriginalTxData.processOriginalTxData(downloadedOriginalTxsData)
        } else {
          console.log(
            `Got 0 originalTxData when querying for page ${page} of cycle ${cycle} from distributor ${DISTRIBUTOR_URL}`
          )
          break
        }
        page++
        if (config.verbose)
          console.log('totalDownloadOriginalTxsData', totalDownloadOriginalTxsData, downloadedOriginalTxsData)
        if (totalDownloadOriginalTxsData === originalTxsData) {
          console.log('totalDownloadOriginalTxsData for cycle', cycle, totalDownloadOriginalTxsData)
          break
        }
      } else {
        console.log(
          `Can't fetch originalTxsData for  page ${page} of cycle ${cycle} from distributor ${DISTRIBUTOR_URL}`
        )
        break
      }
    }
  }
}

export const downloadCyclcesBetweenCycles = async (
  startCycle: number,
  totalCyclesToSync: number,
  saveOnlyNewData = false
): Promise<void> => {
  let endCycle = startCycle + MAX_CYCLES_PER_REQUEST
  for (; startCycle <= totalCyclesToSync; ) {
    if (endCycle > totalCyclesToSync) endCycle = totalCyclesToSync
    const response = await queryFromDistributor(DataType.CYCLE, { startCycle, endCycle })
    if (response && response.data && response.data.cycleInfo) {
      console.log(`Downloaded cycles`, response.data.cycleInfo.length)
      const cycles = response.data.cycleInfo
      const combineCycles = []
      for (let i = 0; i < cycles.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const cycle = cycles[i]
        if (!cycle.marker || cycle.counter < 0) {
          console.log('Invalid Cycle Received', cycle)
          continue
        }
        const cycleObj = {
          counter: cycle.counter,
          cycleRecord: cycle,
          cycleMarker: cycle.marker,
        }
        if (saveOnlyNewData) {
          const existingCycle = await Cycle.queryCycleByCounter(cycleObj.counter)
          if (existingCycle) continue
        } else combineCycles.push(cycleObj)
        combineCycles.push(cycleObj)
      }
      await Cycle.bulkInsertCycles(combineCycles)
    }
    startCycle = endCycle + 1
    endCycle += MAX_CYCLES_PER_REQUEST
  }
  console.log('Download completed for cycles between counter', startCycle, 'and', endCycle)
}

export const downloadReceiptsBetweenCycles = async (
  startCycle: number,
  totalCyclesToSync: number,
  saveOnlyNewData = false
): Promise<void> => {
  let endCycle = startCycle + MAX_BETWEEN_CYCLES_PER_REQUEST
  for (; startCycle <= totalCyclesToSync; ) {
    if (endCycle > totalCyclesToSync) endCycle = totalCyclesToSync
    console.log(`Downloading receipts from cycle ${startCycle} to cycle ${endCycle}`)
    let response = await queryFromDistributor(DataType.RECEIPT, { startCycle, endCycle, type: 'count' })
    if (response && response.data && response.data.receipts) {
      console.log(`Download receipts Count`, response.data.receipts)
      const receiptsCount = response.data.receipts
      for (let i = 1; i <= Math.ceil(receiptsCount / MAX_BETWEEN_CYCLES_PER_REQUEST); i++) {
        response = await queryFromDistributor(DataType.RECEIPT, { startCycle, endCycle, page: i })
        if (response && response.data && response.data.receipts) {
          console.log(`Downloaded receipts`, response.data.receipts.length)
          const receipts = response.data.receipts
          await Receipt.processReceiptData(receipts, saveOnlyNewData)
        }
      }
    } else {
      if (response && response.data && response.data.receipts !== 0)
        console.log('Receipt', 'Invalid download response')
    }
    startCycle = endCycle + 1
    endCycle += MAX_BETWEEN_CYCLES_PER_REQUEST
  }
}

export const downloadOriginalTxsDataBetweenCycles = async (
  startCycle: number,
  totalCyclesToSync: number,
  saveOnlyNewData = false
): Promise<void> => {
  let endCycle = startCycle + MAX_BETWEEN_CYCLES_PER_REQUEST
  for (; startCycle <= totalCyclesToSync; ) {
    if (endCycle > totalCyclesToSync) endCycle = totalCyclesToSync
    console.log(`Downloading originalTxsData from cycle ${startCycle} to cycle ${endCycle}`)
    let response = await queryFromDistributor(DataType.ORIGINALTX, { startCycle, endCycle, type: 'count' })
    if (response && response.data && response.data.originalTxs) {
      console.log(`Download originalTxsData Count`, response.data.originalTxs)
      const originalTxsDataCount = response.data.originalTxs
      for (let i = 1; i <= Math.ceil(originalTxsDataCount / MAX_BETWEEN_CYCLES_PER_REQUEST); i++) {
        response = await queryFromDistributor(DataType.ORIGINALTX, { startCycle, endCycle, page: i })
        if (response && response.data && response.data.originalTxs) {
          console.log(`Downloaded originalTxsData`, response.data.originalTxs.length)
          const originalTxsData = response.data.originalTxs
          await OriginalTxData.processOriginalTxData(originalTxsData, saveOnlyNewData)
        }
      }
    } else {
      if (response && response.data && response.data.originalTxs !== 0)
        console.log('OriginalTxData', 'Invalid download response')
    }
    startCycle = endCycle + 1
    endCycle += MAX_BETWEEN_CYCLES_PER_REQUEST
  }
}
