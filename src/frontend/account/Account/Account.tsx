import moment from 'moment'
import React, { Fragment, useState } from 'react'
import Web3Utils from 'web3-utils'

import { useAccount } from '../../api'
import { AnchorLink, ContentLayout, Pagination } from '../../components'
import { Table } from '../../components/TableComp'
import { IColumnProps } from '../../components/TableComp/Table'
import { Account as AccountT, breadcrumbsList } from '../../types'

import styles from './Account.module.scss'

const siblingCount = 3
const limit = 10

const tableColumns = [
  {
    key: 'accountId',
    value: 'Account Address',
    render: (val: unknown, item: any) => (
      <AnchorLink
        href={`/account/${item?.ethAddress}`}
        label={val as string}
        size="small"
        width={400}
        ellipsis
      />
    ),
  },
  {
    key: 'account.balance',
    value: 'Balance',
    render: (_: any, item: any) => (
      <>{`${Number(Web3Utils.fromWei(item?.account?.balance, 'ether')).toFixed()} SHM`}</>
    ),
  },
  {
    key: 'timestamp',
    value: 'Last Used',
    render: (val: unknown) => moment(val as string).fromNow(),
  },
  {
    key: 'contractInfo',
    value: 'Account Type',
    render: (val: any) => (val ? 'Contract Account' : 'User Account'),
  },
]

export const Account: React.FC = () => {
  const [page, setPage] = useState(1)

  const { accounts, loading, totalAccounts } = useAccount({ page })

  const breadcrumbs = [breadcrumbsList.dashboard]

  return (
    <div className={styles.Account}>
      <ContentLayout title="All Accounts" breadcrumbItems={breadcrumbs} showBackButton>
        {loading ? (
          <div>Loading...</div>
        ) : accounts && accounts.length > 0 ? (
          <Fragment>
            <Table columns={tableColumns} data={accounts} />
            <div className={styles.paginationWrapper}>
              <Pagination
                onPageChange={(p) => setPage(p)}
                totalCount={totalAccounts}
                siblingCount={siblingCount}
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
