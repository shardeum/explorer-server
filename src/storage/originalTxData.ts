import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import { InternalTXType, TransactionType, OriginalTxData, TransactionSearchType } from '../types'
import { getTransactionObj, isStakingEVMTx, getStakeTxBlobFromEVMTx } from '../utils/decodeEVMRawTx'
import { bufferToHex } from 'ethereumjs-util'

type DbOriginalTxData = OriginalTxData & {
  originalTxData: string
  sign: string
}

export const originalTxsMap: Map<string, number> = new Map()

export async function insertOriginalTxData(originalTxData: OriginalTxData): Promise<void> {
  try {
    const fields = Object.keys(originalTxData).join(', ')
    const placeholders = Object.keys(originalTxData).fill('?').join(', ')
    const values = extractValues(originalTxData)
    const sql = 'INSERT OR REPLACE INTO originalTxsData (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted OriginalTxData', originalTxData.txId)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert OriginalTxData or it is already stored in to database', originalTxData)
  }
}

export async function bulkInsertOriginalTxsData(originalTxsData: OriginalTxData[]): Promise<void> {
  try {
    const fields = Object.keys(originalTxsData[0]).join(', ')
    const placeholders = Object.keys(originalTxsData[0]).fill('?').join(', ')
    const values = extractValuesFromArray(originalTxsData)
    let sql = 'INSERT OR REPLACE INTO originalTxsData (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < originalTxsData.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully bulk inserted OriginalTxsData', originalTxsData.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert OriginalTxsData', originalTxsData.length)
  }
}

export async function processOriginalTxData(originalTxsData: OriginalTxData[]): Promise<void> {
  console.log('originalTxsData size', originalTxsData.length)
  if (originalTxsData && originalTxsData.length <= 0) return
  const bucketSize = 1000
  let combineOriginalTxsData: OriginalTxData[] = []

  for (const originalTxData of originalTxsData) {
    const txId = originalTxData.txId
    if (originalTxsMap.has(txId)) continue
    originalTxsMap.set(txId, originalTxData.cycle)
    // console.log('originalTxData', originalTxData)
    try {
      if (originalTxData.originalTxData.tx.raw) {
        // EVM Tx
        const txObj = getTransactionObj(originalTxData.originalTxData.tx)
        // console.log('txObj', txObj)
        if (txObj) {
          let transactionType = TransactionType.Receipt
          if (isStakingEVMTx(txObj)) {
            const internalTxData: any = getStakeTxBlobFromEVMTx(txObj)
            // console.log('internalTxData', internalTxData)
            if (internalTxData) {
              if (internalTxData.internalTXType === InternalTXType.Stake) {
                transactionType = TransactionType.StakeReceipt
              } else if (internalTxData.internalTXType === InternalTXType.Unstake) {
                transactionType = TransactionType.UnstakeReceipt
              } else console.log('Unknown staking evm tx type', internalTxData)
            }
          }
          combineOriginalTxsData.push({
            ...originalTxData,
            txHash: bufferToHex(txObj.hash()),
            transactionType,
          })
        } else {
          console.log('Unable to get txObj from EVM raw tx', originalTxData.originalTxData.tx.raw)
        }
      } else {
        combineOriginalTxsData.push({
          ...originalTxData,
          txHash: '0x' + originalTxData.txId,
          transactionType: TransactionType.InternalTxReceipt,
        })
      }
    } catch (e) {
      console.log('Error in processing original Tx data', originalTxData.txId, e)
    }
    if (combineOriginalTxsData.length >= bucketSize) {
      await bulkInsertOriginalTxsData(combineOriginalTxsData)
      combineOriginalTxsData = []
    }
  }
  if (combineOriginalTxsData.length > 0) await bulkInsertOriginalTxsData(combineOriginalTxsData)
}

export async function queryOriginalTxDataCount(
  txType?: TransactionSearchType,
  afterTimestamp?: number,
  startCycle?: number,
  endCycle?: number
): Promise<number> {
  let originalTxsData: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  try {
    let sql = `SELECT COUNT(*) FROM originalTxsData`
    const values: any[] = []
    if (startCycle && endCycle) {
      sql += ` WHERE cycle BETWEEN ? AND ?`
      values.push(startCycle, endCycle)
    }
    if (afterTimestamp) {
      if (startCycle && endCycle) sql += ` AND timestamp>?`
      else sql += ` WHERE timestamp>?`
      values.push(afterTimestamp)
    }
    if (txType) {
      if ((startCycle && endCycle) || afterTimestamp) sql += ` AND`
      else sql += ` WHERE`
      if (txType === TransactionSearchType.AllExceptInternalTx) {
        sql += ` transactionType!=?`
        values.push(TransactionType.InternalTxReceipt)
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        sql += ` transactionType=?`
        values.push(ty)
      }
    }
    originalTxsData = await db.get(sql, values)
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('OriginalTxData count', originalTxsData)
  return originalTxsData['COUNT(*)'] || 0
}

export async function queryOriginalTxsData(
  skip = 0,
  limit = 10,
  txType?: TransactionSearchType,
  afterTimestamp?: number,
  startCycle?: number,
  endCycle?: number
): Promise<OriginalTxData[]> {
  let originalTxsData: DbOriginalTxData[] = []
  try {
    let sql = `SELECT * FROM originalTxsData`
    const sqlSuffix = ` ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
    const values: any[] = []
    if (startCycle && endCycle) {
      sql += ` WHERE cycle BETWEEN ? AND ?`
      values.push(startCycle, endCycle)
    }
    if (afterTimestamp) {
      if (startCycle && endCycle) sql += ` AND timestamp>?`
      else sql += ` WHERE timestamp>?`
      values.push(afterTimestamp)
    }
    if (txType) {
      if ((startCycle && endCycle) || afterTimestamp) sql += ` AND`
      else sql += ` WHERE`
      if (txType === TransactionSearchType.AllExceptInternalTx) {
        sql += ` transactionType!=?`
        values.push(TransactionType.InternalTxReceipt)
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        sql += ` transactionType=?`
        values.push(ty)
      }
    }
    sql += sqlSuffix
    originalTxsData = await db.all(sql, values)
    originalTxsData.forEach((originalTxData: DbOriginalTxData) => {
      if (originalTxData.originalTxData)
        originalTxData.originalTxData = JSON.parse(originalTxData.originalTxData)
      if (originalTxData.sign) originalTxData.sign = JSON.parse(originalTxData.sign)
    })
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('OriginalTxData originalTxsData', originalTxsData)
  return originalTxsData
}

export async function queryOriginalTxDataByTxId(txId: string): Promise<OriginalTxData | null> {
  try {
    const sql = `SELECT * FROM originalTxsData WHERE txId=?`
    const originalTxData: DbOriginalTxData = await db.get(sql, [txId])
    if (originalTxData) {
      if (originalTxData.originalTxData)
        originalTxData.originalTxData = JSON.parse(originalTxData.originalTxData)
      if (originalTxData.sign) originalTxData.sign = JSON.parse(originalTxData.sign)
    }
    if (config.verbose) console.log('OriginalTxData txId', originalTxData)
    return originalTxData as OriginalTxData
  } catch (e) {
    console.log(e)
  }
  return null
}

export async function queryOriginalTxDataByTxHash(txHash: string): Promise<OriginalTxData | null> {
  try {
    const sql = `SELECT * FROM originalTxsData WHERE txHash=?`
    const originalTxData: DbOriginalTxData = await db.get(sql, [txHash])
    if (originalTxData) {
      if (originalTxData.originalTxData)
        originalTxData.originalTxData = JSON.parse(originalTxData.originalTxData)
      if (originalTxData.sign) originalTxData.sign = JSON.parse(originalTxData.sign)
    }
    if (config.verbose) console.log('OriginalTxData txHash', originalTxData)
    return originalTxData as OriginalTxData
  } catch (e) {
    console.log(e)
  }
  return null
}

export async function queryOriginalTxDataCountByCycles(
  start: number,
  end: number
): Promise<{ originalTxsData: number; cycle: number }[]> {
  let originalTxsData: { cycle: number; 'COUNT(*)': number }[] = []
  try {
    const sql = `SELECT cycle, COUNT(*) FROM originalTxsData GROUP BY cycle HAVING cycle BETWEEN ? AND ? ORDER BY cycle ASC`
    originalTxsData = await db.all(sql, [start, end])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('OriginalTxData count by cycles', originalTxsData)

  return originalTxsData.map((originalTxData) => {
    return {
      originalTxsData: originalTxData['COUNT(*)'],
      cycle: originalTxData.cycle,
    }
  })
}

export function cleanOldOriginalTxsMap(currentCycleCounter: number): void {
  for (const [key, value] of originalTxsMap) {
    // Clean originalTxs that are older than current cycle
    if (value < currentCycleCounter) {
      originalTxsMap.delete(key)
    }
  }
  if (config.verbose) console.log('Clean old originalTxs map!', currentCycleCounter)
}
