import * as crypto from '@shardus/crypto-utils'
import * as ArchivedCycle from '../storage/archivedCycle'
import * as utils from '../utils'
import { config as CONFIG } from '../config'
import { insertOrUpdateTransaction } from '../storage/transaction'
import { insertOrUpdateAccount } from '../storage/account'
import { insertOrUpdateCycle } from '../storage/cycle'
import { processReceiptData } from '../storage/receipt'
export interface Data {
  archivedCycles: any[]
  sign: {
    owner: string
    sig: string
  }
}

export interface NewData {
  receipts: any[]
  cycles: any[]
  sign: {
    owner: string
    sig: string
  }
}

export class Collector {
  constructor() {}

  async processData(data: Data) {
    let err = utils.validateTypes(data, { sign: 'o', archivedCycles: 'a' })
    if (err) {
      return
    }
    err = utils.validateTypes(data.sign, { owner: 's', sig: 's' })
    if (err) {
      return
    }
    // the archiverinfo is hard-coded at the moment
    if (data.sign.owner !== CONFIG.archiverInfo.publicKey) {
      console.log('Data received from archive-server has invalid key')
      return
    }
    if (!crypto.verifyObj(data)) {
      console.log('Data received from archive-server has invalid signature')
      return
    }
    if (!data.archivedCycles) {
      console.log('Data received from archive-server is invalid')
      return
    }
    const { archivedCycles } = data
    // [TODO] validate sender of this data
    for (const archivedCycle of archivedCycles) {
      // [TODO] better interface check for received archived cycle
      if (!archivedCycle.cycleRecord || !archivedCycle.cycleMarker) {
        console.log('Invalid Archived Cycle Received', archivedCycle)
        return
      }
      if (archivedCycle.data) {
        const archivedCycleData = archivedCycle.data
        if (
          !archivedCycleData.parentCycle ||
          !archivedCycleData.networkHash ||
          !archivedCycleData.partitionHashes
        ) {
          console.log('The data field in ArchivedCycle is invalid', archivedCycleData)
          return
        }
        if (
          typeof archivedCycleData.parentCycle !== 'string' ||
          typeof archivedCycleData.networkHash !== 'string' ||
          typeof archivedCycleData.partitionHashes !== 'object'
        ) {
          console.log('The data field in ArchivedCycle is invalid', archivedCycleData)
          return
        }
      }
      if (archivedCycle.receipt) {
        const archivedCycleReceipt = archivedCycle.receipt
        if (
          !archivedCycleReceipt.parentCycle ||
          !archivedCycleReceipt.networkHash ||
          !archivedCycleReceipt.partitionHashes ||
          !archivedCycleReceipt.partitionMaps ||
          !archivedCycleReceipt.partitionMaps
        ) {
          console.log('The receipt field in ArchivedCycle is invalid', archivedCycleReceipt)
          return
        }
        if (
          typeof archivedCycleReceipt.parentCycle !== 'string' ||
          typeof archivedCycleReceipt.networkHash !== 'string' ||
          typeof archivedCycleReceipt.partitionHashes !== 'object' ||
          typeof archivedCycleReceipt.partitionMaps !== 'object' ||
          typeof archivedCycleReceipt.partitionTxs !== 'object'
        ) {
          console.log('The receipt field in ArchivedCycle is invalid', archivedCycleReceipt)
          return
        }
      }
      if (archivedCycle.summary) {
        const archivedCycleSummary = archivedCycle.summary
        if (
          !archivedCycleSummary.parentCycle ||
          !archivedCycleSummary.networkHash ||
          !archivedCycleSummary.partitionHashes ||
          !archivedCycleSummary.partitionBlobs
        ) {
          console.log('The receipt field in ArchivedCycle is invalid', archivedCycleSummary)
          return
        }
        if (
          typeof archivedCycleSummary.parentCycle !== 'string' ||
          typeof archivedCycleSummary.networkHash !== 'string' ||
          typeof archivedCycleSummary.partitionHashes !== 'object' ||
          typeof archivedCycleSummary.partitionBlobs !== 'object'
        ) {
          console.log('The summary field in ArchivedCycle is invalid', archivedCycleSummary)
          return
        }
      }
      if (archivedCycle._id) delete archivedCycle._id // temp fix because Archiver sending with _id
      const existingArchivedCycle = await ArchivedCycle.queryArchivedCycleByMarker(archivedCycle.cycleMarker)
      if (existingArchivedCycle && existingArchivedCycle._id) delete existingArchivedCycle._id
      if (existingArchivedCycle && existingArchivedCycle.counter) delete existingArchivedCycle.counter
      if (JSON.stringify(archivedCycle) === JSON.stringify(existingArchivedCycle)) {
        console.log('Skip same data')
        continue
      }

      let proceed = false

      const cycleRecord = archivedCycle.cycleRecord

      const cycleActiveNodesSize =
        cycleRecord.active + cycleRecord.activated.length - cycleRecord.removed.length

      if (archivedCycle.receipt && archivedCycle.receipt.partitionMaps) {
        if (cycleActiveNodesSize === Object.keys(archivedCycle.receipt.partitionMaps).length) {
          proceed = true
          if (cycleRecord.active > Object.keys(archivedCycle.receipt.partitionMaps).length) {
            console.log(
              `The active nodes size in ArchivedCycle counter ${cycleRecord.counter} greater than the partitionHashes List.`
            )
          }
        }
      }
      if (!proceed) {
        if (archivedCycle.cycleRecord.counter < 5) {
          // exception for cycle 1, 2, 3, 4
          proceed = true
        } else {
          return
        }
      }
      if (existingArchivedCycle) {
        await ArchivedCycle.updateArchivedCycle(archivedCycle.cycleMarker, archivedCycle)
      } else {
        await ArchivedCycle.insertArchivedCycle(archivedCycle)
      }
      await insertOrUpdateCycle(archivedCycle)
      await insertOrUpdateTransaction(archivedCycle)
      await insertOrUpdateAccount(archivedCycle)
      // if (CONFIG.verbose)
      //   console.log(
      //     !needSyncing,
      //     !dataSyncing,
      //     archivedCycle.cycleRecord.counter - lastSyncedCycle,
      //     syncCycleInterval
      //   );
      // if (
      //   !needSyncing &&
      //   !dataSyncing &&
      //   archivedCycle.cycleRecord.counter - lastSyncedCycle ===
      //     syncCycleInterval
      // ) {
      //   const cycleToSyncTo = lastSyncedCycle + syncCycleInterval - 20;
      //   console.log(
      //     'Sync and Update Old ArchivedCycle Data',
      //     cycleToSyncTo,
      //     lastSyncedCycle
      //   );
      //   toggleDataSyncing();
      //   await syncArchivedCycles(cycleToSyncTo, lastSyncedCycle);
      //   toggleDataSyncing();
      //   updateLastSyncedCycle(cycleToSyncTo);
      //   console.log('lastSyncedCycle', lastSyncedCycle);
      // }
    }
  }

  async processReceipt(data: NewData) {
    let err = utils.validateTypes(data, {
      sign: 'o',
      receipt: 'a?',
      cycle: 'a?',
    })
    if (err) {
      return
    }
    err = utils.validateTypes(data.sign, { owner: 's', sig: 's' })
    if (err) {
      return
    }
    // the archiverinfo is hard-coded at the moment
    if (data.sign.owner !== CONFIG.archiverInfo.publicKey) {
      console.log('Data received from archive-server has invalid key')
      return
    }
    if (!crypto.verifyObj(data)) {
      console.log('Data received from archive-server has invalid signature')
      return
    }
    if (!data.receipts) {
      if (!data.cycles) {
        console.log('Data received from archive-server is invalid')
        return
      }
    }
    const { receipts, cycles } = data
    if (cycles)
      for (const cycle of cycles) {
        if (!cycle.cycleRecord || !cycle.cycleMarker || cycle.counter < 0) {
          console.log('Invalid Cycle Received', cycle)
          return
        }
        await insertOrUpdateCycle(cycle)
      }
    if (receipts) await processReceiptData(receipts)
  }
}
