import * as db from '../../src/storage/sqlite3storage'
import * as csvWriter from 'csv-writer'
import * as fs from 'fs'
import * as path from 'path'
import { Account } from '../../src/types'
import { Utils as StringUtils } from '@shardeum-foundation/lib-types'
import { bigIntToHex } from '@ethereumjs/util'

const CSV_PATH = 'csv/accounts'
const CSV_NAME = 'accounts'
const METADATA_FILE_PATH = 'csv/accounts/metadata.json'
const NETWORK_VERSION = '1.11.0'
const CSV_COPY_PATH = 'csv/s3'

const header = [
  { id: 'version', title: 'version' },
  { id: 'accountId', title: 'accountId' },
  { id: 'cycle', title: 'cycle' },
  { id: 'timestamp', title: 'timestamp' },
  { id: 'ethAddress', title: 'ethAddress' },
  { id: 'account', title: 'account' },
  { id: 'hash', title: 'hash' },
  { id: 'accountType', title: 'accountType' },
  { id: 'contractInfo', title: 'contractInfo' },
  { id: 'contractType', title: 'contractType' },
  { id: 'isGlobal', title: 'isGlobal' },
]

interface Metadata {
  lastProcessedTimestamp: number
}

type DbAccount = Account & {
  account: string
  contractInfo: string
}

db.init()

function getCurrentDateString(): string {
  const date = new Date()
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'long' })
  const year = date.getFullYear()
  return `${day}_${month}_${year}`
}

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

function saveLastProcessedTimestamp(lastProcessedTimestamp: number): void {
  const metadata: Metadata = {
    lastProcessedTimestamp: lastProcessedTimestamp,
  }
  fs.writeFileSync(METADATA_FILE_PATH, JSON.stringify(metadata, null, 2))
}

function getLastProcessedTimestamp(): number {
  try {
    const data = fs.readFileSync(METADATA_FILE_PATH, 'utf-8')
    if (data.trim() === '') {
      console.log('Metadata file is empty, returning default value')
      return 0
    }
    const metadata: Metadata = JSON.parse(data) as Metadata
    return Number.isFinite(metadata.lastProcessedTimestamp) ? metadata.lastProcessedTimestamp : 0
  } catch (error) {
    console.error('Failed to read metadata:', error)
    return 0
  }
}

const accountsDataWriter = csvWriter.createObjectCsvWriter({
  path: `${CSV_PATH}/${getCurrentDateString()}_${CSV_NAME}.csv`,
  header: header,
})

function bigIntReplacer(key: string, value: any): string {
  if(typeof value === 'bigint') {
    return bigIntToHex(value)
  }
  return value
}

function transformAccountRecord(account: any): void {
  if (account?.account?.balance) {
    account.account.balance = bigIntToHex(account.account.balance)
  }
  if(account?.account?.nonce) {
    account.account.nonce = bigIntToHex(account.account.nonce)
  }
  if (account?.account) {
    delete account.account.codeHash
    delete account.account.codeByte
    delete account.account.storageRoot
  }
  delete account.codeHash
  delete account.codeByte
  delete account.storageRoot

  // if(account?.operatorAccountInfo?.stake) {
  //   account.operatorAccountInfo.stake = bigIntToHex(account.operatorAccountInfo.stake)
  // }
  // const operatorAccountInfo = account?.operatorAccountInfo?.operatorAccountInfo
  // if(operatorAccountInfo) {
  //   if(operatorAccountInfo?.operatorStats?.totalNodePenalty) {
  //     operatorAccountInfo.operatorStats.totalNodePenalty = bigIntToHex(operatorAccountInfo.operatorStats.totalNodePenalty)
  //   }
  //   if(operatorAccountInfo?.operatorStats?.totalNodeReward) {
  //     operatorAccountInfo.operatorStats.totalNodeReward = bigIntToHex(operatorAccountInfo.operatorStats.totalNodeReward)
  //   }
  // }
}

async function getMaximumTimestamp(): Promise<number> {
  const sql = 'SELECT MAX(timestamp) as maxTimestamp FROM accounts'
  const result: any = await db.get(sql)
  return result.maxTimestamp
}

async function queryAccountsBetweenTimestamps(
  startTimestamp: number,
  endTimestamp: number,
  offset = 0,
  limit = 100
): Promise<Account[]> {
  let accounts: DbAccount[] = []
  try {
    const sql = `SELECT * FROM accounts WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp LIMIT ${limit} OFFSET ${offset}`
    accounts = await db.all(sql, [startTimestamp, endTimestamp])
    accounts.forEach((account: DbAccount) => {
      if (account.account) {
        account.account = StringUtils.safeJsonParse(account.account)
        transformAccountRecord(account.account)
      }
    })

    // console.log('Accounts accounts', accounts ? accounts.length : accounts, 'offset', offset)
    return accounts
  } catch (e) {
    console.log('Error getting accounts data from DB')
    throw e
  }
}

async function fetchAndWriteAccounts(startTimestamp: number, endTimestamp: number): Promise<void> {
  let offset = 0
  const limit = 1000

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const accounts: Account[] = await queryAccountsBetweenTimestamps(
      startTimestamp,
      endTimestamp,
      offset,
      limit
    )
    if (accounts.length === 0) break

    await accountsDataWriter.writeRecords(
      accounts.map((account) => ({
        version: NETWORK_VERSION,
        ...account,
        account: JSON.stringify(account.account, bigIntReplacer), // Convert JSON fields to strings
      }))
    )

    offset += limit
    console.log(`Processed accounts records from ${offset} to ${offset + limit}`)
  }

  console.log('Data successfully written to CSV file')
}

async function processData(): Promise<void> {
  const startTimestamp = getLastProcessedTimestamp() + 1
  const endTimestamp = await getMaximumTimestamp()
  console.log('Processing accounts data from', startTimestamp, 'to', endTimestamp)
  await fetchAndWriteAccounts(startTimestamp, endTimestamp)
  saveLastProcessedTimestamp(endTimestamp)
  copyFileIfExists()
}

processData().catch(console.error)
