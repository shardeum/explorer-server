/* eslint-disable no-empty */
import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'

export interface TransactionStats {
  timestamp: number
  totalTxs: number
  totalInternalTxs: number
  totalStakeTxs: number
  totalUnstakeTxs: number
  totalSetGlobalCodeBytesTxs: number
  totalInitNetworkTxs: number
  totalNodeRewardTxs: number
  totalChangeConfigTxs: number
  totalApplyChangeConfigTxs: number
  totalSetCertTimeTxs: number
  totalInitRewardTimesTxs: number
  totalClaimRewardTxs: number
  totalChangeNetworkParamTxs: number
  totalApplyNetworkParamTxs: number
  totalPenaltyTxs: number
  cycle: number
}

export async function insertTransactionStats(transactionStats: TransactionStats): Promise<void> {
  try {
    const fields = Object.keys(transactionStats).join(', ')
    const placeholders = Object.keys(transactionStats).fill('?').join(', ')
    const values = extractValues(transactionStats)
    const sql = 'INSERT OR REPLACE INTO transactions (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    console.log('Successfully inserted TransactionStats', transactionStats.cycle)
  } catch (e) {
    console.log(e)
    console.log(
      'Unable to insert transactionStats or it is already stored in to database',
      transactionStats.cycle
    )
  }
}

export async function bulkInsertTransactionsStats(transactionsStats: TransactionStats[]): Promise<void> {
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

export async function queryLatestTransactionStats(count: number): Promise<TransactionStats[]> {
  try {
    const sql = `SELECT * FROM transactions ORDER BY cycle DESC LIMIT ${count ? count : 100}`
    const transactionsStats: TransactionStats[] = await db.all(sql)
    if (config.verbose) console.log('transactionStats count', transactionsStats)
    if (transactionsStats.length > 0) {
      transactionsStats.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
    }
    return transactionsStats
  } catch (e) {
    console.log(e)
  }
}

export async function queryTransactionStatsBetween(
  startCycle: number,
  endCycle: number
): Promise<TransactionStats[]> {
  try {
    const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? AND ? ORDER BY cycle DESC LIMIT 100`
    const transactionsStats: TransactionStats[] = await db.all(sql, [startCycle, endCycle])
    if (config.verbose) console.log('transactionStats between', transactionsStats)
    if (transactionsStats.length > 0) {
      transactionsStats.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
    }
    return transactionsStats
  } catch (e) {
    console.log(e)
  }
}


export async function queryEmptyTransactionStats(currentCycle: number, lookBack: number): Promise<TransactionStats[]> {
  try {
    const startCycle = currentCycle - lookBack;
    const sql = `SELECT * FROM transactions WHERE totalTxs = 0 AND cycle BETWEEN ? AND ?`;
    const emptyTxStats: TransactionStats[] = await db.all(sql, [startCycle, currentCycle]);
    if (config.verbose) {
      console.log(
        `Empty TransactionStats records found between cycles ${startCycle} and ${currentCycle}:`,
        emptyTxStats
      );
    }
    return emptyTxStats;
  } catch (e) {
    console.error('Error querying empty transaction stats:', e);
    return [];
  }
}

