import * as crypto from '@shardus/crypto-utils'
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

export async function validateData(data: Data): Promise<void> {
  let err = utils.validateTypes(data, {
    sign: 'o',
    receipt: 'o?',
    cycle: 'o?',
    originalTx: 'o?',
  })
  if (err) {
    console.error('Data received from distributor failed validation', err)
    return
  }
  err = utils.validateTypes(data.sign, { owner: 's', sig: 's' })
  if (err) {
    return
  }
  if (data.sign.owner !== CONFIG.distributorInfo.publicKey) {
    console.error('Data received from distributor has invalid key')
    return
  }
  if (!crypto.verifyObj(data)) {
    console.error('Data received from distributor has invalid signature')
    return
  }
  if (!data.receipt && !data.cycle && !data.originalTx) {
    console.error('Data received from distributor is invalid', data)
    return
  }

  if (data.receipt) await processReceiptData([data.receipt])

  if (data.cycle) await insertOrUpdateCycle(data.cycle)

  if (data.originalTx) await processOriginalTxData([data.originalTx])
}
