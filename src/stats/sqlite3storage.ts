import { CoinStats } from "./coinStats"
import { TransactionStats } from "./transactionStats"
import { ValidatorStats } from "./validatorStats"

/***
This is the copied code from 'storage/sqlite3storage.ts'
Later, extract the common functions into one place and refactor it to be able to use them in both places.
***/
import sqlite3Lib from 'sqlite3'
const sqlite3 = sqlite3Lib.verbose()
let db: sqlite3Lib.Database

export async function init() {
  db = new sqlite3.Database('statsDB.sqlite3')
  await run('PRAGMA journal_mode=WAL')
  console.log('Stats Database initialized.')
}

export async function runCreate(createStatement: string) {
  await run(createStatement)
}

export async function run(sql: string, params = [] || {}): Promise<{ id: number; }> {
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

export async function get<T>(sql: string, params = []): Promise<T> {
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

export async function all<T>(sql: string, params = []): Promise<T[]> {
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

export function extractValues(object: CoinStats | ValidatorStats | TransactionStats) {
  try {
    const inputs = []
    for (const column of Object.keys(object)) {
      let value = object[column]
      if (typeof value === 'object') value = JSON.stringify(value)
      inputs.push(value)
    }
    return inputs
  } catch (e) {
    console.log(e)
  }
}

export function extractValuesFromArray(arr: any): any {
  try {
    const inputs = []
    for (const object of arr) {
      for (const column of Object.keys(object)) {
        let value = object[column]
        if (typeof value === 'object') value = JSON.stringify(value)
        inputs.push(value)
      }
    }
    return inputs
  } catch (e) {
    console.log(e)
  }
}
