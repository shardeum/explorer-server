import { TransactionFactory, Transaction, TransactionType } from '@ethereumjs/tx'
import { bytesToHex, toAscii, toBytes } from '@ethereumjs/util'
import { config } from '../config'
import { TransactionType as TransactionType2, OriginalTxDataInterface } from '../types'

export function getTransactionObj(
  tx: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Transaction[TransactionType.Legacy] | Transaction[TransactionType.AccessListEIP2930] {
  if (!tx.raw) throw Error('tx has no raw field')
  let transactionObj
  const serializedInput = toBytes(tx.raw)
  try {
    transactionObj = TransactionFactory.fromSerializedData<TransactionType.Legacy>(serializedInput)
  } catch (e) {
    /* prettier-ignore */ if (config.verbose) console.log('Unable to get legacy transaction obj', e)
  }
  if (!transactionObj) {
    try {
      transactionObj =
        TransactionFactory.fromSerializedData<TransactionType.AccessListEIP2930>(serializedInput)
    } catch (e) {
      /* prettier-ignore */ if (config.verbose) console.log('Unable to get transaction obj', e)
    }
  }

  if (transactionObj) {
    return transactionObj
  } else {
    throw Error('tx obj fail')
  }
}

const stakeTargetAddress = '0x0000000000000000000000000000000000010000'

export function isStakingEVMTx(
  transaction: Transaction[TransactionType.Legacy] | Transaction[TransactionType.AccessListEIP2930]
): boolean {
  if (transaction.to && transaction.to.toString() === stakeTargetAddress) return true
  return false
}

export function getStakeTxBlobFromEVMTx(
  transaction: Transaction[TransactionType.Legacy] | Transaction[TransactionType.AccessListEIP2930]
): unknown {
  try {
    const stakeTxString = toAscii(bytesToHex(transaction.data))
    return JSON.parse(stakeTxString)
  } catch (e) {
    console.log('Unable to get stakeTxBlobFromEVMTx', e)
  }
}

export function decodeEVMRawTxData(originalTxData: OriginalTxDataInterface): void {
  if (originalTxData.originalTxData.tx.raw) {
    // EVM Tx
    const txObj = getTransactionObj(originalTxData.originalTxData.tx)
    // Custom readableReceipt for originalTxsData
    if (txObj) {
      const readableReceipt = {
        from: txObj.getSenderAddress().toString(),
        to: txObj.to ? txObj.to.toString() : null,
        nonce: '0x' + txObj.nonce.toString(16),
        value: txObj.value.toString(16),
        data: '0x' + txObj.data.toString(),
        // contractAddress // TODO: add contract address
      }
      if (
        originalTxData.transactionType === TransactionType2.StakeReceipt ||
        originalTxData.transactionType === TransactionType2.UnstakeReceipt
      ) {
        const internalTxData = getStakeTxBlobFromEVMTx(txObj)
        readableReceipt['internalTxData'] = internalTxData
      }
      originalTxData.originalTxData = { ...originalTxData.originalTxData, readableReceipt }
    }
  }
}
