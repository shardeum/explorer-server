import moment from 'moment'
import React, { Fragment } from 'react'
import { AnchorLink, ContentLayout, Pagination } from '../../components'
import { Table } from '../../components/TableComp'
import { breadcrumbsList } from '../../types'
import { Cycle as CycleT } from '../../../types'

import styles from './Cycle.module.scss'
import { useCycleHook } from './useCycleHook'

const header = [
  {
    key: 'cycleRecord.counter',
    value: 'Cycle Number',
    render: (val: unknown, item: CycleT) => (
      <AnchorLink href={`/cycle/${item?.counter}`} label={val as unknown as string} size="small" />
    ),
  },
  {
    key: 'cycleRecord.active',
    value: 'Active Validators',
    render: (val: unknown) => (val ? val : '0'),
  },
  {
    key: 'cycleRecord.activated.length',
    value: 'Activated Validators',
    render: (val: unknown) => (val ? val : '0'),
  },
  {
    key: 'cycleRecord.joined.length',
    value: 'Joined Validators',
    render: (val: unknown) => (val ? val : '0'),
  },
  {
    key: 'cycleRecord.syncing',
    value: 'Syncing Validators',
    render: (val: unknown) => (val ? val : '0'),
  },
  {
    key: 'cycleRecord.removed.length',
    value: 'Removed Validators',
    render: (val: unknown) => (val ? val : '0'),
  },
  {
    key: 'cycleRecord.apoptosized.length',
    value: 'Apoptosized Validators',
    render: (val: unknown) => (val ? val : '0'),
  },
  {
    key: 'cycleRecord.start',
    value: 'Timestamp',
    render: (val: unknown) => moment(parseInt(val as unknown as string, 10) * 1000).calendar(),
  },
]

export const Cycle: React.FC = () => {
  const { cycles, loading, page, setPage, limit, totalCycle } = useCycleHook()

  const breadcrumbs = [breadcrumbsList.dashboard]

  return (
    <div className={styles.Cycle}>
      <ContentLayout title="All Cycles" breadcrumbItems={breadcrumbs} showBackButton>
        {loading ? (
          <div>Loading...</div>
        ) : cycles && cycles.length > 0 ? (
          <Fragment>
            <Table columns={header} data={cycles} />
            <div className={styles.paginationWrapper}>
              <Pagination
                onPageChange={(p) => setPage(p)}
                totalCount={totalCycle}
                siblingCount={2}
                currentPage={page}
                pageSize={limit}
              />
            </div>
          </Fragment>
        ) : (
          <div>No Data.</div>
        )}
      </ContentLayout>
    </div>
  )
}
