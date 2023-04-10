import React from 'react'
import { useRouter } from 'next/router'

import { Button, ContentLayout, Pagination } from '../components'

import { breadcrumbsList, TransactionSearchType } from '../types'

import { useLogHook } from './useLogHook'

import styles from './Log.module.scss'
import { TransactionTable } from '../transaction'

const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.log]

export const Log: React.FC = () => {
  const router = useRouter()

  const { address: addr, topic: tps } = router.query

  const { address, onAddressChange, topic, onTopicChange, onSearch, transactions, total, page, setPage } =
    useLogHook(String(addr || ''), String(tps || ''))

  return (
    <div className={styles.Log}>
      <ContentLayout title="Logs" breadcrumbItems={breadcrumbs} showBackButton>
        <div className={styles.main}>
          <input
            type="text"
            placeholder="Type contract address"
            className={styles.input}
            value={address}
            onChange={onAddressChange}
          />
          <input
            type="text"
            placeholder="Type topics in order to filter (Separate each topic by comma)"
            className={styles.input}
            value={topic}
            onChange={onTopicChange}
          />
          <Button apperance="primary" onClick={onSearch}>
            Search
          </Button>
        </div>
        <TransactionTable data={transactions} txType={TransactionSearchType.AllExceptInternalTx} />
        <Pagination currentPage={page} onPageChange={(p) => setPage(p)} pageSize={10} totalCount={total} />
      </ContentLayout>
    </div>
  )
}
