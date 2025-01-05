import * as db from '../../src/storage/sqlite3storage'
import * as csvWriter from 'csv-writer'
import * as fs from 'fs'
import * as path from 'path'
import { Transaction } from '../../src/types'
import { Utils as StringUtils } from '@shardeum-foundation/lib-types'
import { bigIntToHex } from '@ethereumjs/util'
import { calculateFullValue } from '../../src/frontend/utils/calculateValue'

const CSV_PATH = 'csv/transactions'
const CSV_NAME = 'transactions'
const METADATA_FILE_PATH = 'csv/transactions/metadata.json'
const NETWORK_VERSION = '1.11.0'
const CSV_COPY_PATH = 'csv/s3'

interface Metadata {
  lastProcessedTimestamp: number
}

type DbTransaction = Transaction & {
  wrappedEVMAccount: string
  originalTxData: string
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

const transactionsDataWriter = csvWriter.createObjectCsvWriter({
  path: `${CSV_PATH}/${getCurrentDateString()}_${CSV_NAME}.csv`,
  header: [
    { id: 'version', title: 'version' },
    { id: 'txId', title: 'txId' },
    { id: 'cycle', title: 'cycle' },
    { id: 'timestamp', title: 'timestamp' },
    { id: 'blockNumber', title: 'blockNumber' },
    { id: 'blockHash', title: 'blockHash' },
    // { id: 'wrappedEVMAccount', title: 'WrappedEVMAccount' },
    { id: 'txFrom', title: 'txFrom' },
    { id: 'txTo', title: 'txTo' },
    { id: 'nominee', title: 'nominee' },
    { id: 'txHash', title: 'txHash' },
    { id: 'transactionType', title: 'transactionType' },
    // { id: 'originalTxData', title: 'OriginalTxData' },
    // ['contractAddress','data','from','logs','nonce','status','to','transactionHash','value','isInternalTx','internalTx','stakeInfo']
    { id: 'contractAddress', title: 'contractAddress' },
    { id: 'data', title: 'data' },
    { id: 'from', title: 'from' },
    // { id: 'logs', title: 'Logs' },
    { id: 'nonce', title: 'nonce' },
    { id: 'status', title: 'status' },
    { id: 'to', title: 'to' },
    { id: 'transactionHash', title: 'transactionHash' },
    { id: 'value', title: 'value' },
    { id: 'isInternalTx', title: 'isInternalTx' },
    { id: 'internalTx', title: 'internalTx' },
    // { id: 'stakeInfo', title: 'StakeInfo' },
    // compl1 = ['accountType','amountSpent','ethAddress','txId','hash']
    { id: 'accountType', title: 'accountType' },
    { id: 'amountSpent', title: 'amountSpent' },
    { id: 'ethAddress', title: 'ethAddress' },
    { id: 'hash', title: 'hash' },
    // stake = ['nominee','penalty','reward','stake','totalUnstakeAmount','totalStakeAmount']
    { id: 'penalty', title: 'penalty' },
    { id: 'reward', title: 'reward' },
    { id: 'stake', title: 'stake' },
    { id: 'totalUnstakeAmount', title: 'totalUnstakeAmount' },
    { id: 'totalStakeAmount', title: 'totalStakeAmount' },
    // ( readableReceipt ) <--
    { id: 'value_decimal', title: 'value_decimal' },
    { id: 'amountSpent_decimal', title: 'amountSpent_decimal' },
    { id: 'rewardAmount', title: 'rewardAmount' },
    { id: 'penaltyAmount', title: 'penaltyAmount' },
    { id: 'violationType', title: 'violationType' },
    { id: 'internalTXType', title: 'internalTXType' },
  ],
})

async function getMaximumTimestamp(): Promise<number> {
  const sql = 'SELECT MAX(timestamp) as maxTimestamp FROM transactions'
  const result: any = await db.get(sql)
  return result.maxTimestamp
}

export async function querytransactionRecordsBetweenTimestamps(
  start: number,
  end: number,
  offset = 0,
  limit = 100
): Promise<Transaction[]> {
  try {
    const sql = `SELECT * FROM transactions WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp LIMIT ${limit} OFFSET ${offset}`
    const transactions: DbTransaction[] = await db.all(sql, [start, end])
    if (transactions.length > 0) {
      transactions.forEach((transactionRecord: DbTransaction) => {
        transactionRecord.originalTxData = StringUtils.safeJsonParse(transactionRecord.originalTxData)
        transactionRecord.wrappedEVMAccount = StringUtils.safeJsonParse(transactionRecord.wrappedEVMAccount)
      })
    }
    console.log(
      `transaction between ${start} and ${end} offset ${offset} limit ${limit} --> ${transactions.length}`
    )
    // console.dir(transactions, { depth: null })
    return transactions
  } catch (e) {
    console.log(e)
  }
  return []
}

async function fetchAndWritetransactions(startTimestamp: number, endTimestamp: number): Promise<void> {
  let offset = 0
  const limit = 1000

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const transactions: Transaction[] = await querytransactionRecordsBetweenTimestamps(
      startTimestamp,
      endTimestamp,
      offset,
      limit
    )
    if (transactions.length === 0) break

    const transformedTransactions = transactions.map((transaction) => {
      const transformedTransaction = transformTransaction(transaction)
      transformedTransaction.internalTx = JSON.stringify(transformedTransaction.internalTx)
      return transformedTransaction
    })
    // console.log('transformedTransactions', transformedTransactions)
    await transactionsDataWriter.writeRecords(transformedTransactions)

    offset += limit
    console.log(`Processed ${offset} transaction records...`)
  }

  console.log('Data successfully written to CSV file')
}

const transformTransaction = (tx: Transaction): any => {
  return {
    version: NETWORK_VERSION,
    txId: tx.txId,
    cycle: tx.cycle,
    timestamp: tx.timestamp,
    blockNumber: tx.blockNumber,
    blockHash: tx.blockHash,
    txFrom: tx.txFrom,
    txTo: tx.txTo,
    nominee: tx.nominee,
    txHash: tx.txHash,
    transactionType: tx.transactionType,
    contractAddress: tx.wrappedEVMAccount['readableReceipt']?.['contractAddress'],
    data: tx.wrappedEVMAccount['readableReceipt']?.['data'].slice(0, 65534),
    from: tx.wrappedEVMAccount['readableReceipt']?.['from'],
    // logs: tx.wrappedEVMAccount['readableReceipt']?.['logs'],
    nonce: tx.wrappedEVMAccount['readableReceipt']?.['nonce'],
    status: tx.wrappedEVMAccount['readableReceipt']?.['status'],
    to: tx.wrappedEVMAccount['readableReceipt']?.['to'],
    transactionHash: tx.wrappedEVMAccount['readableReceipt']?.['transactionHash'],
    value: tx.wrappedEVMAccount['readableReceipt']?.['value'],
    isInternalTx: tx.wrappedEVMAccount['readableReceipt']?.['isInternalTx'],
    internalTx: tx.wrappedEVMAccount['readableReceipt']?.['internalTx'],
    accountType: tx.wrappedEVMAccount?.['accountType'],
    amountSpent: tx.wrappedEVMAccount?.['amountSpent'],
    ethAddress: tx.wrappedEVMAccount?.['ethAddress'],
    hash: tx.wrappedEVMAccount?.['hash'],
    penalty:
      tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['penalty'] &&
      bigIntToHex(tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['penalty']).slice('0x'.length),
    reward:
      tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['reward'] &&
      bigIntToHex(tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['reward']),
    stake:
      tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['stake'] &&
      bigIntToHex(tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['stake']),
    totalUnstakeAmount:
      tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['totalUnstakeAmount'] &&
      bigIntToHex(tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['totalUnstakeAmount']),
    totalStakeAmount:
      tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['totalStakeAmount'] &&
      bigIntToHex(tx.wrappedEVMAccount['readableReceipt']?.['stakeInfo']?.['totalStakeAmount']),
    value_decimal:
      tx.wrappedEVMAccount['readableReceipt']?.['value'] &&
      calculateFullValue(tx.wrappedEVMAccount['readableReceipt']?.['value']),
    amountSpent_decimal:
      tx.wrappedEVMAccount?.['amountSpent'] && calculateFullValue(tx.wrappedEVMAccount?.['amountSpent']),
    rewardAmount:
      tx.wrappedEVMAccount['readableReceipt']?.['rewardAmount'] &&
      bigIntToHex(tx.wrappedEVMAccount['readableReceipt']?.['rewardAmount']),
    penaltyAmount:
      tx.wrappedEVMAccount['readableReceipt']?.['penaltyAmount'] &&
      bigIntToHex(tx.wrappedEVMAccount['readableReceipt']?.['penaltyAmount']),
      violationType:
      tx.wrappedEVMAccount['readableReceipt']?.['internalTX']?.['violationType'],
    internalTXType: tx.internalTXType
  }
}

async function processData(): Promise<void> {
  const startTimestamp = getLastProcessedTimestamp() + 1
  const endTimestamp = await getMaximumTimestamp()
  console.log('Processing transactions from', startTimestamp, 'to', endTimestamp)
  await fetchAndWritetransactions(startTimestamp, endTimestamp).catch(console.error)
  saveLastProcessedTimestamp(endTimestamp)
  copyFileIfExists()
}

processData().catch(console.error)
