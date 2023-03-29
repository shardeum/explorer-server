/***
This is the copied code from 'storage/sqlite3storage.ts'
Later, extract the commom functions into one place and refactor it to be able to use them in both places.
***/
const sqlite3 = require('sqlite3').verbose()
let db: any

export async function init() {
  db = new sqlite3.Database('statsDB.sqlite3')
  await run('PRAGMA journal_mode=WAL')
  console.log('Stats Database initialized.')
}

export async function runCreate(createStatement) {
  await run(createStatement)
}

export async function run(sql, params = [] || {}) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
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

export async function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
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

export async function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
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

export function extractValues(object) {
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
