import * as db from '../../src/storage/sqlite3storage'
import * as csvWriter from 'csv-writer'
import * as fs from 'fs'
import * as path from 'path'
import { Cycle } from '../../src/types'
import { Utils as StringUtils } from '@shardeum-foundation/lib-types'
import { JoinRequest, JoinedConsensor } from '@shardeum-foundation/lib-types/build/src/p2p/JoinTypes'

const CSV_PATH = 'csv/cycles'
const CSV_NAME = 'cycles'
const METADATA_FILE_PATH = 'csv/cycles/metadata.json'
const NETWORK_VERSION = '1.11.0'
const CSV_COPY_PATH = 'csv/s3'

const header = [
  { id: 'version', title: 'version' },
  { id: 'eventName', title: 'eventname' },
  { id: 'cycleMarker', title: 'cycleMarker' },
  { id: 'counter', title: 'counter' },
  { id: 'mode', title: 'mode' },
  { id: 'timestampEpoch', title: 'timestamp_epoch' },
  { id: 'publicKey', title: 'publickey' },
  { id: 'id', title: 'id' },
  { id: 'externalIp', title: 'externalIp' },
  { id: 'externalPort', title: 'externalPort' },
  { id: 'nominator', title: 'nominator' },
]

interface Metadata {
  lastProcessedCycleCounter: number
}

type DbCycle = Cycle & {
  cycleRecord: string
}

// ['eventname', 'cycleMarker', 'counter', 'timestamp_epoch', 'publickey', 'id', 'externalIp', 'externalPort']

interface CsvCycleRecord {
  version: string
  eventName: string
  cycleMarker: string
  counter: number
  mode: string
  timestampEpoch: number
  publicKey?: string
  id?: string
  externalIp?: string
  externalPort?: number
  nominator?: string | null
}

const idStates = ['startedSyncing', 'finishedSyncing', 'activated', 'removed', 'apoptosized']
const pubKeyStates = ['standbyAdd', 'standbyRefresh', 'standbyRemove', 'joinedConsensors']

db.init()

function copyFileIfExists(): void {
  const srcFile = `${CSV_PATH}/${getCurrentDateString()}_${CSV_NAME}.csv`
  const destFile = `${CSV_COPY_PATH}/${getCurrentDateString()}/${CSV_NAME}.csv`
  // Check if the source file exists
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (fs.existsSync(srcFile)) {
    // Create the directory for the destination if it doesn't exist
    const destDir = path.dirname(destFile)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(destDir)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.mkdirSync(destDir, { recursive: true })
    }

    // Copy the file to the new location
    fs.copyFileSync(srcFile, destFile)
    console.log(`File copied from ${srcFile} to ${destFile}`)
  } else {
    console.log(`Source file does not exist: ${srcFile}`)
  }
}

function ensurePathExistence(): void {
  const dirname = path.dirname(METADATA_FILE_PATH)
  console.log(dirname)
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true })
  }
  // Check if the metadata file exists
  if (!fs.existsSync(METADATA_FILE_PATH)) {
    fs.writeFileSync(METADATA_FILE_PATH, JSON.stringify({ lastProcessedCycleCounter: 0 }, null, 2), 'utf-8')
    console.log('Metadata file not found. Created new file with default values.')
  }
}

ensurePathExistence()

function saveLastProcessedCycleCounter(lastProcessedCycleCounter: number): void {
  const metadata: Metadata = {
    lastProcessedCycleCounter: lastProcessedCycleCounter,
  }
  fs.writeFileSync(METADATA_FILE_PATH, JSON.stringify(metadata, null, 2))
}

function getLastProcessedCycleCounter(): number {
  try {
    const data = fs.readFileSync(METADATA_FILE_PATH, 'utf-8')
    if (data.trim() === '') {
      console.log('Metadata file is empty, returning default value')
      return 0
    }
    const metadata: Metadata = JSON.parse(data) as Metadata
    return Number.isFinite(metadata.lastProcessedCycleCounter) ? metadata.lastProcessedCycleCounter : 0
  } catch (error) {
    console.error('Failed to read metadata:', error)
    return 0
  }
}

function getCurrentDateString(): string {
  const date = new Date()
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'long' })
  const year = date.getFullYear()
  return `${day}_${month}_${year}`
}

const cyclesDataWriter = csvWriter.createObjectCsvWriter({
  path: `${CSV_PATH}/${getCurrentDateString()}_${CSV_NAME}.csv`,
  header: header,
})

function transformCycleRecord(cycleRecord: Cycle, csvCycleRecords: CsvCycleRecord[]): void {
  Object.keys(cycleRecord.cycleRecord).forEach((key) => {
    // eslint-disable-next-line security/detect-object-injection
    const value = cycleRecord.cycleRecord[key]
    if (
      Array.isArray(value) &&
      !key.toLowerCase().includes('archivers') &&
      (idStates.includes(key) || pubKeyStates.includes(key))
    ) {
      if (key == 'joinedConsensors') {
        value.forEach((item: JoinedConsensor) => {
          csvCycleRecords.push({
            version: NETWORK_VERSION,
            eventName: key,
            cycleMarker: cycleRecord.cycleMarker,
            counter: cycleRecord.counter,
            mode: cycleRecord.cycleRecord.mode,
            timestampEpoch: cycleRecord.cycleRecord.start,
            publicKey: item.publicKey,
            id: item.id,
            nominator: null,
          })
        })
      } else if (key == 'standbyAdd') {
        value.forEach((item: JoinRequest) => {
          csvCycleRecords.push({
            version: NETWORK_VERSION,
            eventName: key,
            cycleMarker: cycleRecord.cycleMarker,
            counter: cycleRecord.counter,
            mode: cycleRecord.cycleRecord.mode,
            timestampEpoch: cycleRecord.cycleRecord.start,
            publicKey: item.nodeInfo.address,
            externalIp: item.nodeInfo.externalIp,
            externalPort: item.nodeInfo.externalPort,
            nominator: item?.appJoinData?.stakeCert?.nominator ?? null,
          })
        })
      } else if (idStates.includes(key)) {
        value.forEach((item: string) => {
          csvCycleRecords.push({
            version: NETWORK_VERSION,
            eventName: key,
            cycleMarker: cycleRecord.cycleMarker,
            counter: cycleRecord.counter,
            mode: cycleRecord.cycleRecord.mode,
            timestampEpoch: cycleRecord.cycleRecord.start,
            id: item,
            nominator: null,
          })
        })
      } else if (pubKeyStates.includes(key)) {
        value.forEach((item: string) => {
          csvCycleRecords.push({
            version: NETWORK_VERSION,
            eventName: key,
            cycleMarker: cycleRecord.cycleMarker,
            counter: cycleRecord.counter,
            mode: cycleRecord.cycleRecord.mode,
            timestampEpoch: cycleRecord.cycleRecord.start,
            publicKey: item,
            nominator: null,
          })
        })
      } else {
        console.log("No valid key found in: ", cycleRecord.counter)
      }
    } else {
      console.log("No valid key found in: ", cycleRecord.counter)
    }
  })
}

async function getMaximumCycleCounter(): Promise<number> {
  const sql = 'SELECT MAX(counter) as maxCycleCounter FROM cycles'
  const result: any = await db.get(sql)
  return result.maxCycleCounter
}

async function queryCycleRecordsBetween(
  start: number,
  end: number,
  offset = 0,
  limit = 100
): Promise<CsvCycleRecord[]> {
  try {
    const csvCycleRecords: CsvCycleRecord[] = []
    const sql = `SELECT * FROM cycles WHERE counter BETWEEN ? AND ? ORDER BY counter LIMIT ${limit} OFFSET ${offset}`
    const cycles: DbCycle[] = await db.all(sql, [start, end])
    if (cycles.length > 0) {
      cycles.forEach((cycleRecord: DbCycle) => {
        if (cycleRecord.cycleRecord)
          cycleRecord.cycleRecord = StringUtils.safeJsonParse(cycleRecord.cycleRecord)
        transformCycleRecord(cycleRecord as Cycle, csvCycleRecords)
      })
    }
    // console.log(`cycle between ${start} and ${end}`, cycles)
    return csvCycleRecords
  } catch (e) {
    console.log(e)
  }
  return []
}

async function fetchAndWriteCycles(startCycle: number, endCycle: number): Promise<void> {
  let offset = 0
  const limit = 1000

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cycleRecords: CsvCycleRecord[] = await queryCycleRecordsBetween(startCycle, endCycle, offset, limit)
    if (cycleRecords.length === 0) break

    await cyclesDataWriter.writeRecords(cycleRecords)

    offset += limit
    console.log(`Processed cycle records from ${offset} to ${offset + limit}`)
  }

  console.log('Data successfully written to CSV file')
}

async function processData(): Promise<void> {
  const startCycle = getLastProcessedCycleCounter() + 1
  const endCycle = await getMaximumCycleCounter()
  console.log('Processing cycles from', startCycle, 'to', endCycle)
  await fetchAndWriteCycles(startCycle, endCycle)
  saveLastProcessedCycleCounter(endCycle)
  copyFileIfExists()
}

processData().catch(console.error)
