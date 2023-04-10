import Link from 'next/link'
import React from 'react'
import { Button, Dropdown } from '../../../components'
import { Transaction } from '../../../types'

import styles from './Logs.module.scss'

interface LogsProps {
  transaction: Transaction
}

export const Logs: React.FC<LogsProps> = ({ transaction }) => {
  // TODO: can't find the data
  return (
    <div className={styles.Logs}>
      {transaction &&
        transaction?.wrappedEVMAccount?.readableReceipt?.logs &&
        transaction?.wrappedEVMAccount?.readableReceipt?.logs.map((log: Log) => (
          <div className={styles.logItem}>
            <Button apperance="outlined" className={styles.count}>
              {log.logIndex}
            </Button>
            <div>
              <div className={styles.item}>
                <div className={styles.title}>Address</div>
                <Link href="/account/123" className={styles.link}>
                  {log.address}
                </Link>
              </div>
              <div className={styles.item}>
                <div className={styles.title}>Topic</div>
                <div>
                  {log.topics &&
                    log.topics.map((topic: string, index: number) => (
                      <div className={styles.row}>
                        <Button apperance="outlined" className={styles.btn}>
                          {index}
                        </Button>
                        <Dropdown
                          items={['Dec', 'Hex']}
                          apperance="outlined"
                          buttonClassName={styles.dropdown}
                        />
                        <Link href="/contract/123" className={styles.link}>
                          {topic}
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
              <div className={styles.item}>
                <div className={styles.title}>Data</div>
                <Link href="/account/123" className={styles.link}>
                  {log.data}
                </Link>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}
