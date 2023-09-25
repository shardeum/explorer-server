import moment from 'moment'
import React, { Fragment, useState } from 'react'

import { useAccount } from '../../api'
import { AnchorLink, ContentLayout, Pagination } from '../../components'
import { Table } from '../../components/TableComp'
import { IColumnProps } from '../../components/TableComp/Table'
import { breadcrumbsList } from '../../types'
import { Account as AccountT } from '../../../types'

import styles from './Account.module.scss'
import { fromWeiNoTrailingComma } from '../../utils/fromWeiNoTrailingComma'

const siblingCount = 3
const limit = 10

const tableColumns: IColumnProps<AccountT>[] = [
  {
    key: 'ethAddress',
    value: 'Account Address',
    render: (val: unknown, item: AccountT) => (
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
    key: 'account.account.balance',
    value: 'Balance',
    render: (_: unknown, item: AccountT) => (
      <>{`${Number(
        fromWeiNoTrailingComma(`0x${item?.account?.account?.balance}`, 'ether')
      ).toFixed()} SHM`}</>
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
    render: (val: unknown) => (val ? 'Contract Account' : 'User Account'),
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
            <Table columns={tableColumns as IColumnProps<AccountT>[]} data={accounts} />
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
