/* eslint-disable no-empty */
import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'

export interface Log {
  cycle: number
  timestamp: number
  txHash: string
  blockNumber: string
  contractAddress: number
  log: unknown
  topic0: string
  topic1?: string
  topic2?: string
  topic3?: string
}

export const EOA_CodeHash = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

export async function insertLog(log: Log) {
  try {
    const fields = Object.keys(log).join(', ')
    const placeholders = Object.keys(log).fill('?').join(', ')
    const values = extractValues(log)
    const sql = 'INSERT OR REPLACE INTO logs (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Log', log.txHash, log.contractAddress)
  } catch (e) {
    console.log(e)
    console.log(
      'Unable to insert Log or it is already stored in to database',
      log.txHash,
      log.contractAddress
    )
  }
}

export async function bulkInsertLogs(logs: Log[]) {
  try {
    const fields = Object.keys(logs[0]).join(', ')
    const placeholders = Object.keys(logs[0]).fill('?').join(', ')
    const values = extractValuesFromArray(logs)
    let sql = 'INSERT OR REPLACE INTO logs (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < logs.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully bulk inserted Logs', logs.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert Logs', logs.length)
  }
}

export async function queryLogCount(
  startCycle = 0,
  endCycle = 0,
  type = undefined,
  contractAddress?: string,
  topic0?: string,
  topic1?: string,
  topic2?: string,
  topic3?: string
) {
  let logs: { 'COUNT(txHash)': number } | { 'COUNT(DISTINCT(txHash))': number }
  try {
    let sql = 'SELECT COUNT(txHash) FROM logs '
    let inputs: (string | number)[] = []
    if (type === 'txs') sql = 'SELECT COUNT(DISTINCT(txHash)) FROM logs '
    if (contractAddress && topic0 && topic1 && topic2 && topic3) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=? AND topic2=? AND topic3=?`
      inputs = [contractAddress, topic0, topic1, topic2, topic3]
    } else if (contractAddress && topic0 && topic1 && topic2) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=? AND topic2=?`
      inputs = [contractAddress, topic0, topic1, topic2]
    } else if (contractAddress && topic0 && topic1) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=?`
      inputs = [contractAddress, topic0, topic1]
    } else if (contractAddress && topic0) {
      sql += `WHERE contractAddress=? AND topic0=?`
      inputs = [contractAddress, topic0]
    } else if (contractAddress) {
      sql += `WHERE contractAddress=?`
      inputs = [contractAddress]
    } else if (topic0 && topic1 && topic2 && topic3) {
      sql += `WHERE topic0=? AND topic1=? AND topic2=? AND topic3=?`
      inputs = [topic0, topic1, topic2, topic3]
    } else if (topic0 && topic1 && topic2) {
      sql += `WHERE topic0=? AND topic1=? AND topic2=?`
      inputs = [topic0, topic1, topic2]
    } else if (topic0 && topic1) {
      sql += `WHERE topic0=? AND topic1=?`
      inputs = [topic0, topic1]
    } else if (topic0) {
      sql += `WHERE topic0=?`
      inputs = [topic0]
    }
    if (startCycle >= 0 && endCycle >= 0) {
      if (inputs.length > 0) sql += ` AND cycle BETWEEN ? AND ?`
      else sql += `WHERE cycle BETWEEN ? AND ?`
      inputs = [...inputs, ...[startCycle, endCycle]]
    }
    console.log(sql)
    console.log(inputs)
    logs = await db.get(sql, inputs)
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Log count', logs)

  if (logs && type === 'txs') return logs['COUNT(DISTINCT(txHash))']
  else if (logs) return logs['COUNT(txHash)']
  else return 0
}

export async function queryLogs(
  skip = 0,
  limit = 10,
  startCycle = 0,
  endCycle = 0,
  type = undefined,
  contractAddress?: string,
  topic0?: string,
  topic1?: string,
  topic2?: string,
  topic3?: string
) {
  let logs: Log[]
  try {
    let sql = 'SELECT * FROM logs '
    let inputs: (string | number)[] = []
    let sqlQueryExtension = ` ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
    if (type === 'txs') {
      sqlQueryExtension = ` GROUP BY txHash` + sqlQueryExtension
    }
    if (contractAddress && topic0 && topic1 && topic2 && topic3) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=? AND topic2=? AND topic3=?`
      inputs = [contractAddress, topic0, topic1, topic2, topic3]
    } else if (contractAddress && topic0 && topic1 && topic2) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=? AND topic2=?`
      inputs = [contractAddress, topic0, topic1, topic2]
    } else if (contractAddress && topic0 && topic1) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=?`
      inputs = [contractAddress, topic0, topic1]
    } else if (contractAddress && topic0) {
      sql += `WHERE contractAddress=? AND topic0=?`
      inputs = [contractAddress, topic0]
    } else if (contractAddress) {
      sql += `WHERE contractAddress=?`
      inputs = [contractAddress]
    } else if (topic0 && topic1 && topic2 && topic3) {
      sql += `WHERE topic0=? AND topic1=? AND topic2=? AND topic3=?`
      inputs = [topic0, topic1, topic2, topic3]
    } else if (topic0 && topic1 && topic2) {
      sql += `WHERE topic0=? AND topic1=? AND topic2=?`
      inputs = [topic0, topic1, topic2]
    } else if (topic0 && topic1) {
      sql += `WHERE topic0=? AND topic1=?`
      inputs = [topic0, topic1]
    } else if (topic0) {
      sql += `WHERE topic0=?`
      inputs = [topic0]
    }
    if (startCycle >= 0 && endCycle >= 0) {
      if (inputs.length > 0) sqlQueryExtension = ` AND cycle BETWEEN ? AND ?` + sqlQueryExtension
      else sqlQueryExtension = ` WHERE cycle BETWEEN ? AND ?` + sqlQueryExtension
      inputs = [...inputs, ...[startCycle, endCycle]]
    }
    logs = await db.all(sql + sqlQueryExtension, inputs)
    if (logs.length > 0) {
    logs.forEach((log: Log) => {
        if (log.log) log.log = JSON.parse(log.log)
      })
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Log logs', logs)
  return logs
}

export async function queryLogCountBetweenCycles(startCycleNumber: number, endCycleNumber: number) {
  let logs: { 'COUNT(*)': number }
  try {
    const sql = `SELECT COUNT(*) FROM logs WHERE cycle BETWEEN ? AND ?`
    logs = await db.get(sql, [startCycleNumber, endCycleNumber])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) {
    console.log('Log count between cycle', logs)
  }

  return logs ? logs['COUNT(*)'] : 0
}

export async function queryLogsBetweenCycles(
  skip = 0,
  limit = 10000,
  startCycleNumber: number,
  endCycleNumber: number
) {
  let logs: Log[]
  try {
    const sql = `SELECT * FROM logs WHERE cycle BETWEEN ? AND ? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
    logs = await db.all(sql, [startCycleNumber, endCycleNumber])
    if (logs.length > 0) {
      logs.forEach((log: Log) => {
        if (log.log) log.log = JSON.parse(log.log)
      })
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) {
    console.log('Log logs between cycles', logs ? logs.length : logs, 'skip', skip)
  }

  return logs
}
