import moment from 'moment'
import { useRouter } from 'next/router'
import React from 'react'
import { AnchorLink, Button } from '../../components'
import { Transaction } from '../../../types'

import styles from './LatestTransaction.module.scss'

export interface LatestTransactionsProps {
  transactions: Transaction[]
}

export const LatestTransactions: React.FC<LatestTransactionsProps> = ({ transactions }) => {
  const router = useRouter()

  return (
    <div className={styles.LatestTransactions}>
      <div className={styles.title}>Latest Transactions</div>
      <hr />
      <div className={styles.content}>
        {transactions.map((item) => (
          <div key={item.txId} className={styles.item}>
            <div className={styles.logo}>Tx</div>
            <div>
              <AnchorLink
                href={`/transaction/${item.txHash}`}
                label={item.txHash}
                size="small"
                width={180}
                ellipsis
              />
              <span>{moment(item.timestamp).fromNow()}</span>
            </div>
            <div>
              <div className={styles.row}>
                <span>From</span>
                <AnchorLink
                  href={`/account/${item.txFrom}`}
                  label={item.txFrom}
                  size="small"
                  width={180}
                  ellipsis
                />
              </div>
              <div className={styles.row}>
                <span>To</span>
                <AnchorLink
                  href={`/account/${item.txTo}`}
                  label={item.txTo}
                  size="small"
                  width={180}
                  ellipsis
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <hr />
      <Button
        className={styles.button}
        apperance="outlined"
        size="medium"
        onClick={() => {
          router.push('/transaction')
        }}
      >
        View all transactions
      </Button>
    </div>
  )
}
