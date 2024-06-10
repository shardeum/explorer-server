import Link from 'next/link'
import React from 'react'
import { Dropdown } from '../../../components'
import { Transaction } from '../../../../types'
import { Log } from '../../../types/transaction'

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
        transaction?.wrappedEVMAccount?.readableReceipt?.logs.map((log: Log, index: number) => (
          <div className={styles.logItem} key={index}>
            <div className={styles.box}>{log.logIndex}</div>
            <div>
              <div className={styles.item}>
                <div className={styles.title}>Address</div>
                <Link href={`/account/${log.address}`} className={styles.link}>
                  {log.address}
                </Link>
              </div>
              <div className={styles.item}>
                <div className={styles.title}>Topic</div>
                <div>
                  {log.topics &&
                    log.topics.map((topic: string, index: number) => (
                      <div className={styles.row} key={index}>
                        <div className={styles.smallbox}>{index}</div>
                        <Dropdown
                          items={['Dec', 'Hex']}
                          apperance="outlined"
                          buttonClassName={styles.dropdown}
                        />
                        <div className={styles.link}>{topic}</div>
                      </div>
                    ))}
                </div>
              </div>
              <div className={styles.item}>
                <div className={styles.title}>Data</div>
                <div className={styles.link}>{log.data}</div>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}
