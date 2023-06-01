import axios from 'axios'
import * as crypto from '@shardus/crypto-utils'
import * as ArchivedCycle from '../storage/archivedCycle'
import * as Account from '../storage/account'
import * as Transaction from '../storage/transaction'
import * as Cycle from '../storage/cycle'
import * as Receipt from '../storage/receipt'
import { config, ARCHIVER_URL } from '../config'

export let needSyncing = false

export let lastSyncedCycle = 0
export let syncCycleInterval = 10 // To query in every 5 cycles ( the other 5 cycles receipt could be not finalized yet )
export let dataSyncing = false

export const toggleNeedSyncing = (): void => {
  needSyncing = !needSyncing
  if (config.verbose) console.log('needSyncing', needSyncing)
}

export const toggleDataSyncing = (): void => {
  dataSyncing = !dataSyncing
  if (config.verbose) console.log('dataSyncing', dataSyncing)
}

export const updateLastSyncedCycle = (cycle: number): void => {
  lastSyncedCycle = cycle
}

export const compareWithOldArchivedCyclesData = async (
  lastCycleCounter: number
): Promise<{ success: boolean; cycle: number }> => {
  const response = await axios.get(
    `${ARCHIVER_URL}/full-archive?start=${lastCycleCounter - 20}&end=${lastCycleCounter}`
  )
  if (response && response.data && response.data.archivedCycles) {
    downloadedArchivedCycles = response.data.archivedCycles
  } else {
    throw Error(
      `Can't fetch data from cycle ${
        lastCycleCounter - 20
      } to cycle ${lastCycleCounter}  from archiver server`
    )
  }
  let oldArchivedCycles = await ArchivedCycle.queryAllArchivedCyclesBetween(
    lastCycleCounter - 19,
    lastCycleCounter
  )
  downloadedArchivedCycles.sort((a, b) => (a.cycleRecord.counter > b.cycleRecord.counter ? 1 : -1))
  oldArchivedCycles.sort((a: { cycleRecord: { counter: number } }, b: { cycleRecord: { counter: number } }) =>
    a.cycleRecord.counter > b.cycleRecord.counter ? 1 : -1
  )
  let success = false
  let cycle = 0
  for (let i = 0; i < downloadedArchivedCycles.length; i++) {
    let downloadedArchivedCycle = downloadedArchivedCycles[i]
    const oldArchivedCycle = oldArchivedCycles[i]
    if (oldArchivedCycle.counter) delete oldArchivedCycle.counter
    console.log(downloadedArchivedCycle.cycleRecord.counter, oldArchivedCycle.cycleRecord.counter)
    if (JSON.stringify(downloadedArchivedCycle) !== JSON.stringify(oldArchivedCycle)) {
      return {
        success,
        cycle,
      }
    }
    success = true
    cycle = downloadedArchivedCycle.cycleRecord.counter
  }
  return { success, cycle }
}

export async function compareWithOldReceiptsData(
  lastStoredReceiptCycle = 0
): Promise<{ success: boolean; matchedCycle: number }> {
  let endCycle = lastStoredReceiptCycle
  let startCycle = endCycle - 10 > 0 ? endCycle - 10 : 0
  let downloadedReceiptCountByCycles: string | any[]
  const response = await axios.get(
    `${ARCHIVER_URL}/receipt?start=${lastStoredReceiptCycle - 10}&end=${lastStoredReceiptCycle}`
  )
  if (response && response.data && response.data.receipts) {
    downloadedReceiptCountByCycles = response.data.receipts
  } else {
    throw Error(
      `Can't fetch receipts data from cycle ${startCycle} to cycle ${endCycle}  from archiver ${ARCHIVER_URL}`
    )
  }
  let oldReceiptCountByCycle = await Receipt.queryReceiptCountByCycles(startCycle, endCycle)
  let success = false
  let matchedCycle = 0
  for (let i = 0; i < downloadedReceiptCountByCycles.length; i++) {
    const downloadedReceipt = downloadedReceiptCountByCycles[i]
    const oldReceipt = oldReceiptCountByCycle[i]
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

export const compareWithOldCyclesData = async (
  lastCycleCounter: number
): Promise<{ success: boolean; cycle: number }> => {
  const response = await axios.get(
    `${ARCHIVER_URL}/cycleinfo?start=${lastCycleCounter - 10}&end=${lastCycleCounter - 1}`
  )
  if (response && response.data && response.data.cycleInfo) {
    downloadedCycles = response.data.cycleInfo
  } else {
    throw Error(
      `Can't fetch data from cycle ${lastCycleCounter - 10} to cycle ${
        lastCycleCounter - 1
      }  from archiver server`
    )
  }
  let oldCycles = await Cycle.queryCycleRecordsBetween(lastCycleCounter - 10, lastCycleCounter + 1)
  downloadedCycles.sort((a, b) => (a.counter > b.counter ? 1 : -1))
  oldCycles.sort((a: { cycleRecord: { counter: number } }, b: { cycleRecord: { counter: number } }) =>
    a.cycleRecord.counter > b.cycleRecord.counter ? 1 : -1
  )
  let success = false
  let cycle = 0
  for (let i = 0; i < downloadedCycles.length; i++) {
    let downloadedCycle = downloadedCycles[i]
    const oldCycle = oldCycles[i]
    console.log(downloadedCycle.counter, oldCycle.cycleRecord.counter)
    if (JSON.stringify(downloadedCycle) !== JSON.stringify(oldCycle.cycleRecord)) {
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

export const insertArchivedCycleData = async (
  downloadedArchivedCycles: ArchivedCycle.ArchivedCycle[]
): Promise<void> => {
  for (let i = 0; i < downloadedArchivedCycles.length; i++) {
    let counter = downloadedArchivedCycles[i].cycleRecord.counter
    let downloadedArchivedCycle = downloadedArchivedCycles[i]

    if (!downloadedArchivedCycle) {
      console.log('Unable to download archivedCycle for counter', counter)
      continue
    }

    const { isDataSynced, isReceiptSynced, isSummarySynced } = checkStateMetaData(
      downloadedArchivedCycle,
      counter
    )

    if (isDataSynced && isReceiptSynced && isSummarySynced) {
      const existingArchivedCycle = await ArchivedCycle.queryArchivedCycleByMarker(
        downloadedArchivedCycle.cycleMarker
      )
      if (existingArchivedCycle) {
        await ArchivedCycle.updateArchivedCycle(downloadedArchivedCycle.cycleMarker, downloadedArchivedCycle)
      } else {
        await ArchivedCycle.insertArchivedCycle(downloadedArchivedCycle)
      }
      await Cycle.insertOrUpdateCycle(downloadedArchivedCycle)
      await Transaction.insertOrUpdateTransaction(downloadedArchivedCycle)
      await Account.insertOrUpdateAccount(downloadedArchivedCycle)
      console.log(`Successfully synced ArchivedCycle for counter ${counter}`)
    } else {
      if (
        !downloadedArchivedCycle.data &&
        !downloadedArchivedCycle.receipt &&
        !downloadedArchivedCycle.summary &&
        downloadedArchivedCycle.cycleRecord.counter < 5
      ) {
        // exception for cycle 1, 2, 3, 4
        const existingArchivedCycle = await ArchivedCycle.queryArchivedCycleByMarker(
          downloadedArchivedCycle.cycleMarker
        )
        if (existingArchivedCycle) {
          await ArchivedCycle.updateArchivedCycle(
            downloadedArchivedCycle.cycleMarker,
            downloadedArchivedCycle
          )
        } else {
          await ArchivedCycle.insertArchivedCycle(downloadedArchivedCycle)
        }
        await Cycle.insertOrUpdateCycle(downloadedArchivedCycle)
        await Transaction.insertOrUpdateTransaction(downloadedArchivedCycle)
        await Account.insertOrUpdateAccount(downloadedArchivedCycle)
        console.log(`Successfully synced ArchivedCycle for counter ${counter}`)
      }
    }
  }
}

export const calculateNetworkHash = (data: object): string => {
  let hashArray = []
  if (data) {
    for (const hash of Object.values(data)) {
      hashArray.push(hash)
    }
  }
  hashArray = hashArray.sort()
  const calculatedHash = crypto.hashObj(hashArray)
  return calculatedHash
}

export const downloadAndInsertArchivedCycles = async (
  cycleToSyncTo: number,
  startCycle = 0
): Promise<void> => {
  let complete = false
  let start = startCycle
  let end = start + 100
  while (!complete) {
    if (end >= cycleToSyncTo) {
      let res = await axios.get(`${ARCHIVER_URL}/full-archive/1`)
      if (res.data && res.data.archivedCycles && res.data.archivedCycles.length > 0) {
        cycleToSyncTo = res.data.archivedCycles[0].cycleRecord.counter
        console.log('cycleToSyncTo', cycleToSyncTo)
      }
    }
    console.log(`Downloading archive from cycle ${start} to cycle ${end}`)
    const response = await axios.get(`${ARCHIVER_URL}/full-archive?start=${start}&end=${end}`)
    if (response && response.data && response.data.archivedCycles) {
      // collector = collector.concat(response.data.archivedCycles);
      if (response.data.archivedCycles.length < 100) {
        complete = true
        console.log('Download completed')
      }
      const downloadedArchivedCycles = response.data.archivedCycles
      console.log(`Downloaded archived cycles`, downloadedArchivedCycles.length)
      downloadedArchivedCycles.sort((a, b) => (a.cycleRecord.counter > b.cycleRecord.counter ? 1 : -1))
      await insertArchivedCycleData(downloadedArchivedCycles)
    } else {
      console.log('Invalid download response')
    }
    start = end
    end += 100
  }
}

export const checkStateMetaData = (
  downloadedArchivedCycle: ArchivedCycle.ArchivedCycle,
  counter: number
): { isDataSynced: boolean; isReceiptSynced: boolean; isSummarySynced: boolean } => {
  let isDataSynced = false
  let isReceiptSynced = false
  let isSummarySynced = false

  // Check data hashes
  if (downloadedArchivedCycle.data) {
    const downloadedNetworkDataHash = downloadedArchivedCycle.data.networkHash
    const calculatedDataHash = calculateNetworkHash(downloadedArchivedCycle.data.partitionHashes)
    if (downloadedNetworkDataHash === calculatedDataHash) {
      isDataSynced = true
    } else {
      console.log('Different network data hash for cycle', counter)
    }
  } else {
    console.log(
      `ArchivedCycle ${downloadedArchivedCycle.cycleRecord.counter}, ${downloadedArchivedCycle.cycleMarker} does not have data field`
    )
  }

  // Check receipt hashes
  if (downloadedArchivedCycle.receipt) {
    const downloadedNetworkReceiptHash = downloadedArchivedCycle.receipt.networkHash
    const calculatedReceiptHash = calculateNetworkHash(downloadedArchivedCycle.receipt.partitionHashes)
    if (downloadedNetworkReceiptHash === calculatedReceiptHash) {
      isReceiptSynced = true
    } else {
      console.log('Different network receipt hash for cycle', counter)
    }
  } else {
    console.log(
      `ArchivedCycle ${downloadedArchivedCycle.cycleRecord.counter}, ${downloadedArchivedCycle.cycleMarker} does not have receipt field`
    )
  }

  // Check summary hashes
  if (downloadedArchivedCycle.summary) {
    const downloadedNetworkSummaryHash = downloadedArchivedCycle.summary.networkHash
    const calculatedSummaryHash = calculateNetworkHash(downloadedArchivedCycle.summary.partitionHashes)
    if (downloadedNetworkSummaryHash === calculatedSummaryHash) {
      isSummarySynced = true
    } else {
      console.log('Different network summary hash for cycle', counter)
    }
  } else {
    console.log(
      `ArchivedCycle ${downloadedArchivedCycle.cycleRecord.counter}, ${downloadedArchivedCycle.cycleMarker} does not have summary field`
    )
  }
  return { isDataSynced, isReceiptSynced, isSummarySynced }
}

export const downloadAndInsertReceiptsAndCycles = async (
  totalReceiptsToSync: number,
  fromReceipt = 0,
  totalCyclesToSync: number,
  fromCycle = 0
): Promise<void> => {
  let completeForReceipt = false
  let completeForCycle = false
  let startReceipt = fromReceipt
  let startCycle = fromCycle
  let endReceipt = startReceipt + 1000
  let endCycle = startCycle + 1000
  let patchData = config.patchData
  if (startReceipt === 0) patchData = true
  if (!patchData) completeForReceipt = true
  while (!completeForReceipt || !completeForCycle) {
    if (endReceipt >= totalReceiptsToSync || endCycle >= totalCyclesToSync) {
      let res = await axios.get(`${ARCHIVER_URL}/totalData`)
      if (res.data && res.data.totalCycles && res.data.totalReceipts) {
        if (totalReceiptsToSync < res.data.totalReceipts) {
          completeForReceipt = false
          totalReceiptsToSync = res.data.totalReceipts
        }
        if (totalCyclesToSync < res.data.totalCycles) {
          completeForCycle = false
          totalCyclesToSync = res.data.totalCycles
        }
        if (!patchData) completeForReceipt = true
        console.log('totalReceiptsToSync', totalReceiptsToSync, 'totalCyclesToSync', totalCyclesToSync)
      }
    }
    if (!completeForReceipt) {
      console.log(`Downloading receipts from ${startReceipt} to ${endReceipt}`)
      const response = await axios.get(`${ARCHIVER_URL}/receipt?start=${startReceipt}&end=${endReceipt}`)
      if (response && response.data && response.data.receipts) {
        // collector = collector.concat(response.data.archivedCycles);
        console.log(`Downloaded receipts`, response.data.receipts.length)
        await Receipt.processReceiptData(response.data.receipts)
        if (response.data.receipts.length < 1000) {
          completeForReceipt = true
          endReceipt += response.data.receipts.length
          startReceipt = endReceipt
          endReceipt += 1000
          console.log('Download completed for receipts')
        } else {
          startReceipt = endReceipt
          endReceipt += 1000
        }
      } else {
        console.log('Receipt', 'Invalid download response')
      }
    }
    if (!completeForCycle) {
      console.log(`Downloading cycles from ${startCycle} to ${endCycle}`)
      const response = await axios.get(`${ARCHIVER_URL}/cycleinfo?start=${startCycle}&end=${endCycle}`)
      if (response && response.data && response.data.cycleInfo) {
        console.log(`Downloaded cycles`, response.data.cycleInfo.length)
        const cycles = response.data.cycleInfo
        let bucketSize = 1000
        let combineCycles = []
        for (let i = 0; i < cycles.length; i++) {
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
          if (combineCycles.length >= bucketSize || i === cycles.length - 1) {
            await Cycle.bulkInsertCycles(combineCycles)
            combineCycles = []
          }
        }
        if (response.data.cycleInfo.length < 1000) {
          completeForCycle = true
          endCycle += response.data.cycleInfo.length
          startCycle = endCycle
          endCycle += 1000
          console.log('Download completed for cycles')
        } else {
          startCycle = endCycle
          endCycle += 1000
        }
      } else {
        console.log('Cycle', 'Invalid download response')
      }
    }
  }
  console.log('Sync Cycle and Receipt data completed!')
}

export const downloadAndSyncGenesisAccounts = async (): Promise<void> => {
  let completeSyncingAccounts = false
  let completeSyncTransactions = false
  let startAccount = 0
  let endAccount = startAccount + 10000
  let startTransaction = 0
  let endTransaction = startTransaction + 10000
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
    const res = await axios.get(`${ARCHIVER_URL}/account?startCycle=0&endCycle=5`)
    if (res && res.data && res.data.totalAccounts) {
      totalGenesisAccounts = res.data.totalAccounts
    } else {
      console.log('Genesis Account', 'Invalid download response')
      return
    }
    if (totalGenesisAccounts <= 0) return
    let page = 0
    while (!completeSyncingAccounts) {
      console.log(`Downloading accounts from ${startAccount} to ${endAccount}`)
      const response = await axios.get(`${ARCHIVER_URL}/account?startCycle=0&endCycle=5&page=${page}`)
      if (response && response.data && response.data.accounts) {
        // collector = collector.concat(response.data.archivedCycles);
        if (response.data.accounts.length < 10000) {
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
      endAccount += 10000
      page++
      // await sleep(1000);
    }
    await Transaction.processTransactionData(combineTransactions)
  }
  if (totalExistingGenesisTransactionReceipts === 0) {
    const res = await axios.get(`${ARCHIVER_URL}/transaction?startCycle=0&endCycle=5`)
    if (res && res.data && res.data.totalTransactions) {
      totalGenesisTransactionReceipts = res.data.totalTransactions
    } else {
      console.log('Genesis Transaction Receipt', 'Invalid download response')
      return
    }
    if (totalGenesisTransactionReceipts <= 0) return
    let page = 0
    while (!completeSyncTransactions) {
      console.log(`Downloading transactions from ${startTransaction} to ${endTransaction}`)
      const response = await axios.get(`${ARCHIVER_URL}/transaction?startCycle=0&endCycle=5&page=${page}`)
      if (response && response.data && response.data.transactions) {
        // collector = collector.concat(response.data.archivedCycles);
        if (response.data.transactions.length < 10000) {
          completeSyncTransactions = true
          console.log('Download completed for transactions')
        }
        console.log(`Downloaded transactions`, response.data.transactions.length)
        await Transaction.processTransactionData(response.data.transactions)
      } else {
        console.log('Genesis Transaction Receipt', 'Invalid download response')
      }
      startTransaction = endTransaction
      endTransaction += 10000
      page++
    }
  }
  console.log('Sync Genesis accounts and transaction receipts completed!')
}

export const checkIfAnyReceiptsMissing = async (cycle: number): Promise<void> => {
  if (config.verbose) console.log(!needSyncing, !dataSyncing, cycle - lastSyncedCycle, syncCycleInterval)
  if (!needSyncing && !dataSyncing && cycle - lastSyncedCycle >= syncCycleInterval) {
    const cycleToSyncTo = lastSyncedCycle + syncCycleInterval - 5
    toggleDataSyncing()
    // await (cycleToSyncTo, lastSyncedCycle)
    const unMatchedCycle = await compareReceiptsCountByCycles(lastSyncedCycle + 1, cycleToSyncTo)
    console.log(
      `Check receipts data between ${lastSyncedCycle + 1} and ${cycleToSyncTo}`,
      'unMatchedCycle',
      unMatchedCycle
    )
    if (unMatchedCycle.length > 0) await downloadReceiptsByCycle(unMatchedCycle)
    toggleDataSyncing()
    updateLastSyncedCycle(cycleToSyncTo)
    Receipt.cleanReceiptsMap(cycleToSyncTo)
    if (config.verbose) console.log('lastSyncedCycle', lastSyncedCycle)
  }
}

export async function compareReceiptsCountByCycles(
  startCycle: number,
  endCycle: number
): Promise<{ cycle: number; receipts: number }[]> {
  let unMatchedCycle = []
  let downloadedReceiptCountByCycle
  const response = await axios.get(
    `${ARCHIVER_URL}/receipt?startCycle=${startCycle}&endCycle=${endCycle}&type=tally`
  )
  if (response && response.data && response.data.receipts) {
    downloadedReceiptCountByCycle = response.data.receipts
  } else {
    console.log(
      `Can't fetch receipts count between cycle ${startCycle} and cycle ${endCycle} from archiver ${ARCHIVER_URL}`
    )
    return
  }
  let existingReceiptCountByCycle = await Receipt.queryReceiptCountByCycles(startCycle, endCycle)
  if (config.verbose) console.log('downloadedReceiptCountByCycle', downloadedReceiptCountByCycle)
  if (config.verbose) console.log('existingReceiptCountByCycle', existingReceiptCountByCycle)
  for (let i = 0; i < downloadedReceiptCountByCycle.length; i++) {
    const downloadedReceipt = downloadedReceiptCountByCycle[i]

    let existingReceipt = existingReceiptCountByCycle.find(
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

export async function downloadReceiptsByCycle(
  data: { cycle: number; receipts: number }[] = []
): Promise<void> {
  for (const { cycle, receipts } of data) {
    let page = 1
    let totalDownloadedReceipts = 0
    while (true) {
      const response = await axios.get(
        `${ARCHIVER_URL}/receipt?startCycle=${cycle}&endCycle=${cycle}&page=${page}`
      )
      if (response && response.data && response.data.receipts) {
        const downloadedReceipts = response.data.receipts
        if (downloadedReceipts.length > 0) {
          totalDownloadedReceipts += downloadedReceipts.length
          await Receipt.processReceiptData(downloadedReceipts)
        } else {
          console.log(
            `Got 0 receipts when querying for page ${page} of cycle ${cycle} from archiver ${ARCHIVER_URL}`
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
        console.log(`Can't fetch receipts for  page ${page} of cycle ${cycle} from archiver ${ARCHIVER_URL}`)
        break
      }
    }
  }
}

export const downloadReceiptsBetweenCycles = async (
  startCycle: number,
  totalCyclesToSync: number
): Promise<void> => {
  let endCycle = startCycle + 100
  for (; startCycle < totalCyclesToSync; ) {
    if (endCycle > totalCyclesToSync) endCycle = totalCyclesToSync
    console.log(`Downloading receipts from cycle ${startCycle} to cycle ${endCycle}`)
    let response = await axios.get(
      `${ARCHIVER_URL}/receipt?startCycle=${startCycle}&endCycle=${endCycle}&type=count`
    )
    if (response && response.data && response.data.receipts) {
      console.log(`Download receipts Count`, response.data.receipts)
      const receiptsCount = response.data.receipts
      for (let i = 1; i <= Math.ceil(receiptsCount / 100); i++) {
        response = await axios.get(
          `${ARCHIVER_URL}/receipt?startCycle=${startCycle}&endCycle=${endCycle}&page=${i}`
        )
        if (response && response.data && response.data.receipts) {
          console.log(`Downloaded receipts`, response.data.receipts.length)
          const receipts = response.data.receipts
          await Receipt.processReceiptData(receipts)
        }
      }
    } else {
      if (response && response.data && response.data.receipts !== 0)
        console.log('Receipt', 'Invalid download response')
    }
    startCycle = endCycle + 1
    endCycle += 100
  }
}
