import { config } from '../config/index'
import * as db from './sqlite3storage'
import { extractValues } from './sqlite3storage'

export interface CoinStats {
  cycle: number
  timestamp: number
  totalSupplyChange: number
  totalStakeChange: number
}

export async function insertCoinStats(coinStats: CoinStats) {
  try {
    const fields = Object.keys(coinStats).join(', ')
    const placeholders = Object.keys(coinStats).fill('?').join(', ')
    const values = extractValues(coinStats)
    let sql = 'INSERT OR REPLACE INTO coin_stats (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    console.log('Successfully inserted coinStats', coinStats.cycle)
  } catch (e) {
    console.log('Unable to insert coinStats or it is already stored in to database', coinStats.cycle, e)
  }
}

export async function queryLatestCoinStats(count?: number) {
  try {
    const sql = `SELECT * FROM coin_stats ORDER BY cycle DESC LIMIT ${count ? count : 100}`
    const coinStats: any = await db.all(sql)
    if (config.verbose) console.log('coinStats count', coinStats)
    return coinStats
  } catch (e) {
    console.log('Unable to retrieve latest coinStats from the database', e)
  }
}

export async function queryAggregatedCoinStats() {
  try {
    const sql = `SELECT sum(totalSupplyChange) as totalSupplyChange, sum(totalStakeChange) as totalStakeChange FROM coin_stats`
    const coinStats: any = await db.get(sql)
    if (config.verbose) console.log('aggregated coin stats', coinStats)
    return coinStats
  } catch (e) {
    console.log('Unable to retrieve aggregated coin stats', e)
  }
}
