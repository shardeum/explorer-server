import * as db from './sqlite3storage'
import { extractValues } from './sqlite3storage'
import { config } from '../config/index'
import { StateManager, P2P } from '@shardus/types'

export let Collection: unknown

export interface ArchivedCycle {
  counter: number
  cycleRecord: P2P.CycleCreatorTypes.CycleRecord
  cycleMarker: StateManager.StateMetaDataTypes.CycleMarker
  data: StateManager.StateMetaDataTypes.StateData
  receipt: StateManager.StateMetaDataTypes.Receipt
  summary: StateManager.StateMetaDataTypes.Summary
}

interface DbArchivedCycle {
  counter: number
  cycleRecord: string
  cycleMarker: string
  data: string
  receipt: string
  summary: string
}

export function isArchivedCycle(obj: ArchivedCycle): obj is ArchivedCycle {
  return (obj as ArchivedCycle).cycleRecord !== undefined && (obj as ArchivedCycle).cycleMarker !== undefined
}

export async function insertArchivedCycle(archivedCycle: ArchivedCycle) {
  try {
    archivedCycle.counter = archivedCycle.cycleRecord.counter
    const fields = Object.keys(archivedCycle).join(', ')
    const placeholders = Object.keys(archivedCycle).fill('?').join(', ')
    const values = extractValues(archivedCycle)
    const sql = 'INSERT OR REPLACE INTO archivedCycles (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    console.log(
      'Successfully inserted archivedCycle',
      archivedCycle.cycleRecord.counter,
      archivedCycle.cycleRecord.marker
    )
  } catch (e) {
    console.log(e)
    console.log(
      'Unable to insert archive cycle or it is already stored in to database',
      archivedCycle.cycleRecord.counter
    )
  }
}

export async function updateArchivedCycle(marker: string, archivedCycle: ArchivedCycle) {
  try {
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
    const archivedCycles: DbArchivedCycle[] = await db.all(sql)
    if (archivedCycles.length > 0) {
      archivedCycles.forEach((archiveCycle: DbArchivedCycle) => {
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

export async function queryAllArchivedCyclesBetween(start: number, end: number): Promise<ArchivedCycle[]> {
  try {
    const sql = `SELECT * FROM archivedCycles WHERE counter BETWEEN ? AND ? ORDER BY counter DESC LIMIT 100`
    const archivedCycles: DbArchivedCycle[] = await db.all(sql, [start, end])
    if (archivedCycles.length > 0) {
      archivedCycles.forEach((archiveCycle: DbArchivedCycle) => {
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

export async function queryArchivedCycleByMarker(marker: string) {
  try {
    const sql = `SELECT * FROM archivedCycles WHERE cycleMarker=? LIMIT 1`
    const archivedCycles: DbArchivedCycle = await db.get(sql, [marker])
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
    const archivedCycles: DbArchivedCycle = await db.get(sql, [counter])
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
