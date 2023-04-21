/* eslint-disable no-empty */
import * as db from './sqlite3storage'
import { extractValues } from './sqlite3storage'
import { config } from '../config/index'
import { StateManager, P2P } from '@shardus/types'

export let Collection: any

export interface ArchivedCycle {
  counter: number
  cycleRecord: P2P.CycleCreatorTypes.CycleRecord
  cycleMarker: StateManager.StateMetaDataTypes.CycleMarker
  data: StateManager.StateMetaDataTypes.StateData
  receipt: StateManager.StateMetaDataTypes.Receipt
  summary: StateManager.StateMetaDataTypes.Summary
}

export function isArchivedCycle(obj: ArchivedCycle): obj is ArchivedCycle {
  return (obj as ArchivedCycle).cycleRecord !== undefined && (obj as ArchivedCycle).cycleMarker !== undefined
}

export async function insertArchivedCycle(archivedCycle: any) {
  try {
    archivedCycle.counter = archivedCycle.cycleRecord.counter
    const fields = Object.keys(archivedCycle).join(', ')
    const placeholders = Object.keys(archivedCycle).fill('?').join(', ')
    const values = extractValues(archivedCycle)
    let sql = 'INSERT OR REPLACE INTO archivedCycles (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    console.log(
      'Successfully inserted archivedCycle',
      archivedCycle.cycleRecord.counter,
      archivedCycle.cycleRecord.marker
    )
  } catch (e) {
    // const archivedCycleExist = await queryArchivedCycleByMarker(
    //   archivedCycle.cycleMarker
    // );
    // if (archivedCycleExist) {
    //   if (archivedCycle._id) delete archivedCycle._id;
    //   if (archivedCycleExist.counter) delete archivedCycleExist.counter;
    //   if (archivedCycle.counter) delete archivedCycle.counter;
    //   console.log(archivedCycleExist, archivedCycle);
    //   if (
    //     JSON.stringify(archivedCycle) === JSON.stringify(archivedCycleExist)
    //   ) {
    //     console.log('same data', 'archivedCycle');
    //     return;
    //   } else {
    //     console.log('not same data');
    //   }
    // }
    console.log(e)
    console.log(
      'Unable to insert archive cycle or it is already stored in to database',
      archivedCycle.cycleRecord.counter
    )
  }
}

export async function updateArchivedCycle(marker: string, archivedCycle: any) {
  try {
    // if (archivedCycle.cycleMarker) delete archivedCycle.cycleMarker;
    // const values = extractValues(archivedCycle);
    // const sql = `UPDATE archivedCycles SET counter=?, cycleRecord=?, data=?, receipt=?, summary=? WHERE cycleMarker=${marker}`;

    const sql = `UPDATE archivedCycles SET cycleRecord = $cycleRecord, data = $data, receipt = $receipt, summary = $summary WHERE cycleMarker = $cycleMarker `
    await db.run(sql, {
      $cycleRecord: archivedCycle.cycleRecord && JSON.stringify(archivedCycle.cycleRecord),
      $data: archivedCycle.data && JSON.stringify(archivedCycle.data),
      $receipt: archivedCycle.receipt && JSON.stringify(archivedCycle.receipt),
      $summary: archivedCycle.summary && JSON.stringify(archivedCycle.summary),
      $cycleMarker: archivedCycle.cycleMarker,
    })
    console.log(
      'Updated archived cycle for cycle',
      archivedCycle.cycleRecord.counter,
      archivedCycle.cycleMarker
    )
  } catch (e) {
    console.log(e)
    console.log('Unable to update Archived Cycle', marker)
  }
}

export async function queryAllArchivedCycles(count?: number) {
  try {
    const sql = `SELECT * FROM archivedCycles ORDER BY counter DESC LIMIT ${count ? count : 100}`
    const archivedCycles: any = await db.all(sql)
    if (archivedCycles.length > 0) {
      archivedCycles.forEach((archiveCycle: any) => {
        if (archiveCycle.cycleRecord) archiveCycle.cycleRecord = JSON.parse(archiveCycle.cycleRecord)
        if (archiveCycle.data) archiveCycle.data = JSON.parse(archiveCycle.data)
        if (archiveCycle.receipt) archiveCycle.receipt = JSON.parse(archiveCycle.receipt)
        if (archiveCycle.summary) archiveCycle.summary = JSON.parse(archiveCycle.summary)
      })
    }
    if (config.verbose) console.log('ArchivedCycle lastest', archivedCycles)
    return archivedCycles
  } catch (e) {
    console.log(e)
  }
}

export async function queryAllArchivedCyclesBetween(start: number, end: number) {
  try {
    const sql = `SELECT * FROM archivedCycles WHERE counter BETWEEN ? AND ? ORDER BY counter DESC LIMIT 100`
    const archivedCycles: any = await db.all(sql, [start, end])
    if (archivedCycles.length > 0) {
      archivedCycles.forEach((archiveCycle: any) => {
        if (archiveCycle.cycleRecord) archiveCycle.cycleRecord = JSON.parse(archiveCycle.cycleRecord)
        if (archiveCycle.data) archiveCycle.data = JSON.parse(archiveCycle.data)
        if (archiveCycle.receipt) archiveCycle.receipt = JSON.parse(archiveCycle.receipt)
        if (archiveCycle.summary) archiveCycle.summary = JSON.parse(archiveCycle.summary)
      })
    }
    if (config.verbose) console.log('ArchivedCycle cycle between', archivedCycles)
    return archivedCycles
  } catch (e) {
    console.log(e)
  }
}

// export async function queryAllCycleRecords() {
//   const cycleRecords = await Collection.find({
//     filter: {},
//     sort: {
//       'cycleRecord.counter': -1,
//     },
//     project: {
//       _id: 0,
//       cycleMarker: 0,
//       receipt: 0,
//       data: 0,
//       summary: 0,
//     },
//   });
//   return cycleRecords.map((item: any) => item.cycleRecord);
// }

// export async function queryLatestCycleRecords(count = 1) {
//   const cycleRecords = await Collection.find({
//     filter: {},
//     sort: {
//       'cycleRecord.counter': -1,
//     },
//     limit: count,
//     project: {
//       _id: 0,
//       cycleMarker: 0,
//       receipt: 0,
//       data: 0,
//       summary: 0,
//     },
//   });
//   return cycleRecords.map((item: any) => item.cycleRecord);
// }

// export async function queryCycleRecordsBetween(start: number, end: number) {
//   const cycleRecords = await Collection.find({
//     filter: {
//       $and: [
//         {'cycleRecord.counter': {$gte: start}},
//         {'cycleRecord.counter': {$lte: end}},
//       ],
//     },
//     sort: {
//       'cycleRecord.counter': -1,
//     },
//   });
//   return cycleRecords.map((item: any) => item.cycleRecord);
// }

export async function queryArchivedCycleByMarker(marker: string) {
  try {
    const sql = `SELECT * FROM archivedCycles WHERE cycleMarker=? LIMIT 1`
    const archivedCycles: any = await db.get(sql, [marker])
    if (archivedCycles) {
      if (archivedCycles.cycleRecord) archivedCycles.cycleRecord = JSON.parse(archivedCycles.cycleRecord)
      if (archivedCycles.data) archivedCycles.data = JSON.parse(archivedCycles.data)
      if (archivedCycles.receipt) archivedCycles.receipt = JSON.parse(archivedCycles.receipt)
      if (archivedCycles.summary) archivedCycles.summary = JSON.parse(archivedCycles.summary)
    }
    if (config.verbose) console.log('ArchivedCycle marker', archivedCycles)
    return archivedCycles
  } catch (e) {
    console.log(e)
  }
}

export async function queryArchivedCycleByCounter(counter: number) {
  try {
    const sql = `SELECT * FROM archivedCycles WHERE counter=? LIMIT 1`
    const archivedCycles: any = await db.get(sql, [counter])
    if (archivedCycles) {
      if (archivedCycles.cycleRecord) archivedCycles.cycleRecord = JSON.parse(archivedCycles.cycleRecord)
      if (archivedCycles.data) archivedCycles.data = JSON.parse(archivedCycles.data)
      if (archivedCycles.receipt) archivedCycles.receipt = JSON.parse(archivedCycles.receipt)
      if (archivedCycles.summary) archivedCycles.summary = JSON.parse(archivedCycles.summary)
    }
    if (config.verbose) console.log('ArchivedCycle counter', archivedCycles)
    return archivedCycles
  } catch (e) {
    console.log(e)
  }
}

// export const queryCyclesByTimestamp = async (timestamp: number) => {
//   //TODO need to limit 1
//   const data = await Collection.find({
//     filter: {'cycleRecord.start': {$lte: timestamp}},
//     sort: {
//       'cycleRecord.counter': -1,
//     },
//   });
//   if (data.length > 0) return data[0];
// };

// export async function queryArchivedCyleCount() {
//   const ArchivedCyleCount = await Collection.count();
//   if (config.verbose) console.log('ArchivedCycle count', ArchivedCyleCount);
//   console.log('ArchivedCyleCount', ArchivedCyleCount);
//   return ArchivedCyleCount;
// }
