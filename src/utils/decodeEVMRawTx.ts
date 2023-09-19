import { TransactionFactory, Transaction, TransactionType } from '@ethereumjs/tx'
import { bytesToHex, toAscii, toBytes } from '@ethereumjs/util'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTransactionObj(
  tx: any
): Transaction[TransactionType.Legacy] | Transaction[TransactionType.AccessListEIP2930] {
  if (!tx.raw) throw Error('tx has no raw field')
  let transactionObj
  const serializedInput = toBytes(tx.raw)
  try {
    transactionObj = TransactionFactory.fromSerializedData<TransactionType.Legacy>(serializedInput)
  } catch (e) {
    // console.log('Unable to get legacy transaction obj', e)
  }
  if (!transactionObj) {
    try {
      transactionObj =
        TransactionFactory.fromSerializedData<TransactionType.AccessListEIP2930>(serializedInput)
    } catch (e) {
      // console.log('Unable to get transaction obj', e)
    }
  }

  if (transactionObj) {
    return transactionObj
  } else {
    throw Error('tx obj fail')
  }
}

const stakeTargetAddress = '0x0000000000000000000000000000000000000001' //dev-relaunch required to change this '0x0000000000000000000000000000000000010000',

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
