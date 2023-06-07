import Link from 'next/link'
import React from 'react'

import { Icon } from '../../components'

import styles from './CardDetail.module.scss'

export interface CardDetailProps {
  totalCycles: number
  totalNodes: number
  totalTransactions: number
  totalRewardTxs: number
  totalStakeTxs: number
  totalUnstakeTxs: number
  totalAccounts: number
  totalContracts: number
  totalStakedSHM: number
  totalSHM: number
}

export const CardDetail: React.FC<CardDetailProps> = (data) => {
  return (
    <div className={styles.CardDetail}>
      <div className={styles.column}>
        <Link href="/cycle">
          <div className={styles.item}>
            <div className={styles.icon}>
              <Icon name="cycle" size="medium" color="primary" />
            </div>
            <div>
              <p className={styles.title}>Total Cycles</p>
              <p>{data?.totalCycles?.toLocaleString('en-US')}</p>
            </div>
          </div>
        </Link>
        <hr />
        <div className={styles.item}>
          <div className={styles.icon}>
            <Icon name="node" size="medium" color="primary" />
          </div>
          <div>
            <p className={styles.title}>Active Validators</p>
            <p>{data?.totalNodes?.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>
      <div className={styles.column}>
        <Link href="/account">
          <div className={styles.item}>
            <div className={styles.icon}>
              <Icon name="account" size="medium" color="primary" />
            </div>
            <div>
              <p className={styles.title}>Total Accounts</p>
              <p>{data?.totalAccounts?.toLocaleString()}</p>
            </div>
          </div>
        </Link>
        <hr />
        <Link href="/contract">
          <div className={styles.item}>
            <div className={styles.icon}>
              <Icon name="contract" size="medium" color="primary" />
            </div>
            <div>
              <p className={styles.title}>Total Contracts</p>
              <p>{data?.totalContracts?.toLocaleString()}</p>
            </div>
          </div>
        </Link>
      </div>
      <div className={styles.column}>
        <Link href="/transaction">
          <div className={styles.item}>
            <div className={styles.icon}>
              <Icon name="transaction" size="medium" color="primary" />
            </div>
            <div>
              <p className={styles.title}>Total Transactions</p>
              <p>{data?.totalTransactions?.toLocaleString()}</p>
            </div>
          </div>
        </Link>

        <hr />
        <Link href="/transaction">
          <div className={styles.item}>
            <div className={styles.icon}>
              <Icon name="transaction" size="medium" color="primary" />
            </div>
            <div>
              <p className={styles.title}>Total Stake / Unstake Transactions</p>
              <p>
                {data?.totalStakeTxs?.toLocaleString()} / {data?.totalUnstakeTxs?.toLocaleString()}
              </p>
            </div>
          </div>
        </Link>
      </div>
      <div className={styles.column}>
        <Link href="/account">
          <div className={styles.item}>
            <div className={styles.icon}>
              <Icon name="reward" size="medium" color="primary" />
            </div>
            <div>
              <p className={styles.title}>Total SHM</p>
              <p>{data?.totalSHM?.toLocaleString('en-US')}</p>
            </div>
          </div>
        </Link>

        <hr />
        <Link href="/transaction">
          <div className={styles.item}>
            <div className={styles.icon}>
              <Icon name="reward" size="medium" color="primary" />
            </div>
            <div>
              <p className={styles.title}>Total Stake SHM</p>
              <p>{data?.totalStakedSHM?.toLocaleString('en-US')}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
