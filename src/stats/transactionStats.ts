/* eslint-disable no-empty */
import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'

export interface TransactionStats {
  cycle: number
  totalTxs: number
  totalStakeTxs: number
  totalUnstakeTxs: number
  timestamp: number
}

export function isTransaction(obj: TransactionStats): obj is TransactionStats {
  return obj.cycle && obj.totalTxs && obj.timestamp ? true : false
}

export async function insertTransactionStats(transactionStats: TransactionStats) {
  try {
    const fields = Object.keys(transactionStats).join(', ')
    const placeholders = Object.keys(transactionStats).fill('?').join(', ')
    const values = extractValues(transactionStats)
    let sql = 'INSERT OR REPLACE INTO transactions (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    // if (config.verbose)
    console.log('Successfully inserted TransactionStats', transactionStats.cycle)
  } catch (e) {
    // }
    console.log(e)
    console.log(
      'Unable to insert transactionStats or it is already stored in to database',
      transactionStats.cycle
    )
  }
}

export async function bulkInsertTransactionsStats(transactionsStats: TransactionStats[]) {
  try {
    const fields = Object.keys(transactionsStats[0]).join(', ')
    const placeholders = Object.keys(transactionsStats[0]).fill('?').join(', ')
    const values = extractValuesFromArray(transactionsStats)
    let sql = 'INSERT OR REPLACE INTO transactions (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < transactionsStats.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    const addedCycles = transactionsStats.map((v) => v.cycle)
    console.log(
      'Successfully bulk inserted TransactionsStats',
      transactionsStats.length,
      'for cycles',
      addedCycles
    )
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert TransactionsStats', transactionsStats.length)
  }
}

export async function queryLatestTransactionStats(count) {
  try {
    const sql = `SELECT * FROM transactions ORDER BY cycle DESC LIMIT ${count ? count : 100}`
    const transactionsStats: any = await db.all(sql)
    if (config.verbose) console.log('transactionStats count', transactionsStats)
    if (transactionsStats.length > 0) {
      transactionsStats.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
    }
    return transactionsStats
  } catch (e) {
    console.log(e)
  }
}

export async function queryTransactionStatsBetween(startCycle: number, endCycle: number) {
  try {
    const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? AND ? ORDER BY cycle DESC LIMIT 100`
    const transactionsStats: any = await db.all(sql, [startCycle, endCycle])
    if (config.verbose) console.log('transactionStats between', transactionsStats)
    if (transactionsStats.length > 0) {
      transactionsStats.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
    }
    return transactionsStats
  } catch (e) {
    console.log(e)
  }
}
