import * as utils from '../utils'

interface CacheRecordPerCycle<T> {
  lastUpdatedCycle: number
  validationDef?: unknown
  data?: T

  setData(latestCycleNumber: number, data: T): void | Error
}

export function isCacheRecordValid<T>(latestCycleNumber: number, record: CacheRecordPerCycle<T>): boolean {
  return record.lastUpdatedCycle >= latestCycleNumber
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const coinStatsCacheRecord: CacheRecordPerCycle<any> = {
  lastUpdatedCycle: 0,
  validationDef: {
    totalStakeChange: 'n',
    totalSupplyChange: 'n',
  },
  setData(latestCycleNumber: number, data): void | Error {
    const err = utils.validateTypes(data, this.validationDef)
    if (err) {
      return new Error(err)
    }
    console.log(
      `Updating coin stats cache for cycle ${latestCycleNumber}, cache data: ${JSON.stringify(data)}`
    )
    this.lastUpdatedCycle = latestCycleNumber
    this.data = data
  },
}

// Cache record to be used only for validator stats displayed on the explorer home page
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validatorStatsCacheRecord: CacheRecordPerCycle<any> = {
  lastUpdatedCycle: 0,
  setData(latestCycleNumber: number, data): void | Error {
    console.log(`Updating validator stats cache for cycle ${latestCycleNumber}`)
    this.lastUpdatedCycle = latestCycleNumber
    this.data = data
  },
}

// Cache record to be used only for transaction stats displayed on the explorer home page
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const transactionStatsCacheRecord: CacheRecordPerCycle<any> = {
  lastUpdatedCycle: 0,
  setData(latestCycleNumber: number, data): void | Error {
    console.log(`Updating txn stats cache for cycle ${latestCycleNumber}`)
    this.lastUpdatedCycle = latestCycleNumber
    this.data = data
  },
}
