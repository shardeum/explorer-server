/* eslint-disable no-empty */
import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import { P2P, StateManager } from '@shardus/types'


export interface Validator {
    cycle: number
    active: number
    timestamp: number
}

export function isValidator(obj: Validator): obj is Validator {
    return (obj.cycle && obj.active && obj.timestamp) ? true : false
}

export async function insertValidator(validator: Validator) {
    try {
        const fields = Object.keys(validator).join(', ')
        const placeholders = Object.keys(validator).fill('?').join(', ')
        const values = extractValues(validator)
        let sql = 'INSERT OR REPLACE INTO validators (' + fields + ') VALUES (' + placeholders + ')'
        await db.run(sql, values)
        if (config.verbose)
            console.log('Successfully inserted Validator', validator.cycle)
    } catch (e) {
        // }
        console.log(e)
        console.log(
            'Unable to insert validator or it is already stored in to database',
            validator.cycle,
        )
    }
}

export async function bulkInsertValidators(validators: Validator[]) {
    try {
        const fields = Object.keys(validators[0]).join(', ')
        const placeholders = Object.keys(validators[0]).fill('?').join(', ')
        const values = extractValuesFromArray(validators)
        let sql = 'INSERT OR REPLACE INTO validators (' + fields + ') VALUES (' + placeholders + ')'
        for (let i = 1; i < validators.length; i++) {
            sql = sql + ', (' + placeholders + ')'
        }
        await db.run(sql, values)
        console.log('Successfully inserted Validators', validators.length)
    } catch (e) {
        console.log(e)
        console.log('Unable to bulk insert Validators', validators.length)
    }
}

export async function queryLatestValidators(count) {
    try {
        const sql = `SELECT * FROM validators ORDER BY cycle DESC LIMIT ${count ? count : 100}`
        const validators: any = await db.all(sql)
        if (config.verbose) console.log('validator count', validators)
        return validators
    } catch (e) {
        console.log(e)
    }
}

export async function queryValidatorsBetween(startCycle: number, endCycle: number) {
    try {
        const sql = `SELECT * FROM validators WHERE cycle BETWEEN ? AND ? ORDER BY cycle DESC LIMIT 100`
        const validators: any = await db.all(sql, [startCycle, endCycle])
        if (config.verbose) console.log('validator between', validators)
        return validators
    } catch (e) {
        console.log(e)
    }
}
