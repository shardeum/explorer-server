import * as crypto from '@shardeum-foundation/lib-crypto-utils'
import * as utils from '../utils'
import { config as CONFIG } from '../config'
import { insertOrUpdateCycle } from '../storage/cycle'
import { processReceiptData } from '../storage/receipt'
import { processOriginalTxData } from '../storage/originalTxData'
import { Receipt, Cycle, OriginalTxData } from '../types'

export interface Data {
  receipt?: Receipt
  cycle?: Cycle
  originalTx?: OriginalTxData
  sign: {
    owner: string
    sig: string
  }
}

export async function validateData(data: Data): Promise<boolean> {
  let err = utils.validateTypes(data, {
    sign: 'o',
    receipt: 'o?',
    cycle: 'o?',
    originalTx: 'o?',
  })
  if (err) {
    console.error('Data received from distributor failed validation', err)
    return false
  }
  err = utils.validateTypes(data.sign, { owner: 's', sig: 's' })
  if (err) {
    return false
  }
  if (data.sign.owner !== CONFIG.distributorInfo.publicKey) {
    console.error('Data received from distributor has invalid key')
    return false
  }
  if (!crypto.verifyObj(data)) {
    console.error('Data received from distributor has invalid signature')
    return false
  }
  if (!data.receipt && !data.cycle && !data.originalTx) {
    console.error('Data received from distributor is invalid', data)
    return false
  }

  if (data.receipt) {
    await processReceiptData([data.receipt])
    return true
  }

  if (data.cycle) {
    await insertOrUpdateCycle(data.cycle)
    return true
  }

  if (data.originalTx) {
    await processOriginalTxData([data.originalTx])
    return true
  }

  return false
}
