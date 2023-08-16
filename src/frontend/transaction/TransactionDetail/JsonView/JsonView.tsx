import React from 'react'
import { Transaction } from '../../../../types'

import styles from './JsonView.module.scss'

interface JsonViewProps {
  transaction: Transaction
}

export const JsonView: React.FC<JsonViewProps> = ({ transaction }) => {
  return (
    <div className={styles.JsonView}>
      {transaction?.wrappedEVMAccount?.readableReceipt ? (
        <pre>{JSON.stringify(transaction?.wrappedEVMAccount?.readableReceipt, null, 2)}</pre>
      ) : (
        <pre>{JSON.stringify(transaction, null, 2)}</pre>
      )}
    </div>
  )
}
