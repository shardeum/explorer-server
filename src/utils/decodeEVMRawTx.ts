import { AccessListEIP2930Transaction, Transaction } from '@ethereumjs/tx'
import { toBuffer, toAscii } from 'ethereumjs-util'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTransactionObj(tx: any): Transaction | AccessListEIP2930Transaction {
  if (!tx.raw) throw Error('tx has no raw field')
  let transactionObj
  const serializedInput = toBuffer(tx.raw)
  try {
    transactionObj = Transaction.fromSerializedTx(serializedInput)
  } catch (e) {
    // console.log('Unable to get legacy transaction obj', e)
  }
  if (!transactionObj) {
    try {
      transactionObj = AccessListEIP2930Transaction.fromSerializedTx(serializedInput)
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

export function isStakingEVMTx(transaction: Transaction | AccessListEIP2930Transaction): boolean {
  if (transaction.to && transaction.to.toString() === stakeTargetAddress) return true
  return false
}

export function getStakeTxBlobFromEVMTx(transaction: Transaction | AccessListEIP2930Transaction): unknown {
  try {
    const stakeTxString = toAscii(transaction.data.toString('hex'))
    return JSON.parse(stakeTxString)
  } catch (e) {
    console.log('Unable to get stakeTxBlobFromEVMTx', e)
  }
}
