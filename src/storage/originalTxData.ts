import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import { TransactionType } from '../types'

export interface OriginalTxData {
  txId: string
  txHash: string
  timestamp: number
  cycle: number
  originalTxData: unknown
  transactionType: TransactionType
  sign: {
    owner: string
    sig: string
  }
}

export async function insertOriginalTxData(originalTxData: OriginalTxData): Promise<void> {
  try {
    const fields = Object.keys(originalTxData).join(', ')
    const placeholders = Object.keys(originalTxData).fill('?').join(', ')
    const values = extractValues(originalTxData)
    const sql = 'INSERT OR REPLACE INTO originalTxData (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted originalTxData', originalTxData.txId)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert originalTxData or it is already stored in to database', originalTxData)
  }
}

export async function bulkInsertOriginalTxsData(originalTxsData: OriginalTxData[]): Promise<void> {
  try {
    const fields = Object.keys(originalTxsData[0]).join(', ')
    const placeholders = Object.keys(originalTxsData[0]).fill('?').join(', ')
    const values = extractValuesFromArray(originalTxsData)
    let sql = 'INSERT OR REPLACE INTO originalTxData (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < originalTxsData.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully bulk inserted OriginalTxData', originalTxsData.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert OriginalTxData', originalTxsData.length)
  }
}
