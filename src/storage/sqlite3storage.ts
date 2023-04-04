import { TokenTx } from "../@type"
import { Account, Token } from "./account"
import { Cycle } from "./cycle"
import { Log } from "./log"
import { Receipt } from "./receipt"
import { Transaction } from "./transaction"

const sqlite3 = require('sqlite3').verbose()
let db: any

export async function init() {
  db = new sqlite3.Database('db.sqlite3')
  await run('PRAGMA journal_mode=WAL')
  console.log('Database initialized.')
}

export async function runCreate(createStatement: string) {
  await run(createStatement)
}

export async function run(sql: string, params = [] || {}) {
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

export async function get(sql: string, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error, result: unknown) => {
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

export async function all(sql: string, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error, rows: unknown[]) => {
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

export function extractValues(object: Log | Transaction | TokenTx | Account | Token | Receipt | Cycle) {
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
