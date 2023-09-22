/* eslint-disable no-empty */
import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import { padAndPrefixBlockNumber } from '../utils/index'

export interface Log<L = object> {
  cycle: number
  timestamp: number
  txHash: string
  blockNumber: number
  blockHash: string
  contractAddress: string
  log: L
  topic0: string
  topic1?: string
  topic2?: string
  topic3?: string
}

export interface LogQueryRequest {
  address?: string
  topics?: any[]
  fromBlock?: string
  toBlock?: string
}

type DbLog = Log & {
  log: string
}

export const EOA_CodeHash = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

export async function insertLog(log: Log): Promise<void> {
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

export async function bulkInsertLogs(logs: Log[]): Promise<void> {
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

function buildLogQueryString(
  request: LogQueryRequest,
  countOnly: boolean,
  type: string
): { sql: string; values: any[] } {
  let sql
  const queryParams = []
  const values = []
  if (countOnly) {
    sql = 'SELECT COUNT(txHash) FROM logs '
    if (type === 'txs') sql = 'SELECT COUNT(DISTINCT(txHash)) FROM logs '
  } else {
    sql = 'SELECT * FROM logs '
  }
  if (request.address) {
    queryParams.push(`contractAddress=?`)
    values.push(request.address)
  }

  const createTopicQuery = (topicIndex: number, topicValue: any): void => {
    const hexPattern = /^0x[a-fA-F0-9]{64}$/
    if (Array.isArray(topicValue)) {
      const validHexValues = topicValue.filter((value) => typeof value === 'string' && hexPattern.test(value))
      if (validHexValues.length > 0) {
        const query = `topic${topicIndex} IN (${validHexValues.map(() => '?').join(',')})`
        queryParams.push(query)
        values.push(...validHexValues)
      }
    } else if (typeof topicValue === 'string' && hexPattern.test(topicValue)) {
      queryParams.push(`topic${topicIndex}=?`)
      values.push(topicValue)
    }
  }
  // Handling topics array
  if (Array.isArray(request.topics)) {
    request.topics.forEach((topic, index) => createTopicQuery(index, topic))
  }
  const fromBlock = request.fromBlock ? padAndPrefixBlockNumber(request.fromBlock) : null
  const toBlock = request.toBlock ? padAndPrefixBlockNumber(request.toBlock) : null
  if (fromBlock && toBlock) {
    queryParams.push(`blockNumber BETWEEN ? AND ?`)
    values.push(fromBlock)
    values.push(toBlock)
  } else if (fromBlock && !toBlock) {
    queryParams.push(`blockNumber >= ?`)
    values.push(fromBlock)
  } else if (!fromBlock && toBlock) {
    queryParams.push(`blockNumber <= ?`)
    values.push(toBlock)
  }
  sql = `${sql}${queryParams.length > 0 ? ` WHERE ${queryParams.join(' AND ')}` : ''}`
  return { sql, values }
}

export async function queryLogCount(
  startCycle = undefined,
  endCycle = undefined,
  type = undefined,
  contractAddress?: string,
  topics?: any[],
  fromBlock?: string,
  toBlock?: string
): Promise<number> {
  let logs: { 'COUNT(txHash)': number } | { 'COUNT(DISTINCT(txHash))': number } = { 'COUNT(txHash)': 0 }
  try {
    let { sql, values: inputs } = buildLogQueryString(
      {
        address: contractAddress,
        topics,
        fromBlock,
        toBlock,
      },
      true,
      type
    )

    if (startCycle >= 0 && endCycle >= 0) {
      if (inputs.length > 0) sql += ` AND cycle BETWEEN ? AND ?`
      else sql += `WHERE cycle BETWEEN ? AND ?`
      inputs = [...inputs, ...[startCycle, endCycle]]
    }
    if (config.verbose) console.log(sql, inputs)
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
  startCycle?: number,
  endCycle?: number,
  type?: string,
  contractAddress?: string,
  topics?: any[],
  fromBlock?: string,
  toBlock?: string
): Promise<Log[]> {
  let logs: DbLog[] = []
  try {
    const queryString = buildLogQueryString(
      {
        address: contractAddress,
        topics,
        fromBlock,
        toBlock,
      },
      false,
      type
    )
    const sql = queryString.sql
    let inputs = queryString.values

    let sqlQueryExtension = ` ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
    if (type === 'txs') {
      sqlQueryExtension = ` GROUP BY txHash` + sqlQueryExtension
    }

    if (startCycle >= 0 && endCycle >= 0) {
      if (inputs.length > 0) sqlQueryExtension = ` AND cycle BETWEEN ? AND ?` + sqlQueryExtension
      else sqlQueryExtension = ` WHERE cycle BETWEEN ? AND ?` + sqlQueryExtension
      inputs = [...inputs, ...[startCycle, endCycle]]
    }
    if (config.verbose) console.log(sql, inputs)
    logs = await db.all(sql + sqlQueryExtension, inputs)
    if (logs.length > 0) {
      logs.forEach((log: DbLog) => {
        if (log.log) (log as Log).log = JSON.parse(log.log)
      })
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Log logs', logs)
  return logs
}

export async function queryLogCountBetweenCycles(
  startCycleNumber: number,
  endCycleNumber: number
): Promise<number> {
  let logs: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  try {
    const sql = `SELECT COUNT(*) FROM logs WHERE cycle BETWEEN ? AND ?`
    logs = await db.get(sql, [startCycleNumber, endCycleNumber])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) {
    console.log('Log count between cycle', logs)
  }

  return logs['COUNT(*)'] || 0
}

export async function queryLogsBetweenCycles(
  skip = 0,
  limit = 10000,
  startCycleNumber: number,
  endCycleNumber: number
): Promise<Log[]> {
  let logs: DbLog[] = []
  try {
    const sql = `SELECT * FROM logs WHERE cycle BETWEEN ? AND ? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
    logs = await db.all(sql, [startCycleNumber, endCycleNumber])
    if (logs.length > 0) {
      logs.forEach((log: DbLog) => {
        if (log.log) (log as Log).log = JSON.parse(log.log)
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
