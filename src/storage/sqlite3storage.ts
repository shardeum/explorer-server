import sqlite3Lib from 'sqlite3'
const sqlite3 = sqlite3Lib.verbose()
let db: sqlite3Lib.Database
import { config } from '../config/index'
import { Utils as StringUtils } from '@shardeum-foundation/lib-types'

export async function init(): Promise<void> {
  db = new sqlite3.Database(`${config.dbPath}/db.sqlite3`)
  await run('PRAGMA journal_mode=WAL')
  console.log('Database initialized.')
}

export async function runCreate(createStatement: string): Promise<void> {
  await run(createStatement)
}

export async function run(sql: string, params: unknown[] | object = []): Promise<{ id: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err: Error) {
      if (err) {
        console.log('Error running sql ' + sql)
        console.log(err)
        reject(err)
      } else {
        resolve({ id: this.lastID })
      }
    })
  })
}

export async function get<T>(sql: string, params: unknown[] | object = []): Promise<T> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error, result: T) => {
      if (err) {
        console.log('Error running sql: ' + sql)
        console.log(err)
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

/**
 * Close the Database Connections Gracefully
 */
export async function close(): Promise<void> {
  try {
    console.log('Terminating Database/Indexer Connections...')
    await new Promise<void>((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('Error closing Database Connection.')
          reject(err)
        } else {
          console.log('Database connection closed.')
          resolve()
        }
      })
    })
  } catch (err) {
    console.error('Error thrown in closeDatabase() function: ')
    console.error(err)
  }
}

export async function all<T>(sql: string, params: unknown[] | object = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error, rows: T[]) => {
      if (err) {
        console.log('Error running sql: ' + sql)
        console.log(err)
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

export function extractValues(object: object): string[] {
  try {
    const inputs: string[] = []
    for (let value of Object.values(object)) {
      if (typeof value === 'object') value = StringUtils.safeStringify(value)
      inputs.push(value)
    }
    return inputs
  } catch (e) {
    console.log(e)
  }

  return []
}

export function extractValuesFromArray(arr: object[]): string[] {
  try {
    const inputs: string[] = []
    for (const object of arr) {
      for (let value of Object.values(object)) {
        if (typeof value === 'object') value = StringUtils.safeStringify(value)
        inputs.push(value)
      }
    }
    return inputs
  } catch (e) {
    console.log(e)
  }

  return []
}
