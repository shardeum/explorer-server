import React from 'react'
import moment from 'moment'

import { CardDetail } from '../CardDetail'
import { SearchBox } from '../SearchBox'
import { Spacer } from '../../components'

import { useCycle, useTransaction, useAccount, useStats } from '../../api'
import styles from './Dashboard.module.scss'
import { ChartDetail } from '../ChartDetail'
import { AccountSearchType, TransactionSearchType } from '../../types'

import { LatestTransactions } from '../LatestTransaction'
import { LatestCycle } from '../LatestCycle'
import NetworkMode from '../NetworkMode/NetworkMode'

export const Dashboard: React.FC = () => {
  const { data: cycles } = useCycle({ count: 10 })
  const { transactions, totalRewardTxs, totalStakeTxs, totalUnstakeTxs, totalTransactions } = useTransaction({
    count: 10,
    txType: TransactionSearchType.StakeReceipt,
    totalStakeData: true,
  })

  const { totalAccounts, totalContracts } = useAccount({ count: 10, type: AccountSearchType.CA })

  const { validatorStats, transactionStats, totalSHM, totalStakedSHM } = useStats({
    validatorStatsCount: 1000,
    transactionStatsCount: 1000,
    fetchCoinStats: true,
  })

  const cyclesList = cycles.map((row) => {
    return {
      key: row?.cycleRecord?.counter ?? -1,
      value: moment(row?.cycleRecord?.start * 1000).calendar(),
      activeNodes: row?.cycleRecord?.active || 0,
      standbyNodes: row?.cycleRecord?.standby || 0,
    }
  })

  return (
    <div className={styles.Dashboard}>
      <Spacer space="32" />
      <div>
      <SearchBox mode={cycles[0]?.cycleRecord['mode']} />
      </div>
      <Spacer space="48" />
      <section>
        <CardDetail
          totalCycles={cyclesList[0]?.key}
          totalNodes={cyclesList[0]?.activeNodes}
          totalStandby={cyclesList[0]?.standbyNodes}
          totalAccounts={totalAccounts}
          totalContracts={totalContracts}
          totalTransactions={totalTransactions}
          totalRewardTxs={totalRewardTxs}
          totalStakeTxs={totalStakeTxs}
          totalUnstakeTxs={totalUnstakeTxs}
          totalSHM={totalSHM}
          totalStakedSHM={totalStakedSHM}
        />
      </section>
      <Spacer space="48" />
      <section>
        <ChartDetail validatorStats={validatorStats} transactionStats={transactionStats} />
      </section>
      <Spacer space="48" />
      <section>
        <div className={styles.tableGrid}>
          <LatestCycle cycles={cycles} />
          <LatestTransactions transactions={transactions} />
        </div>
      </section>
      <Spacer space="48" />
    </div>
  )
}
