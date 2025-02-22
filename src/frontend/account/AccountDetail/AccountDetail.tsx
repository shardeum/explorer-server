import React, { useState } from 'react'
import { useRouter } from 'next/router'
import web3 from 'web3'
import { utils } from 'ethers'
import moment from 'moment'
import { Button, ContentLayout, CopyButton, Spacer, Pagination } from '../../components'
import { Tab } from '../../components/Tab'
import { DetailCard } from '../DetailCard'
import { TokenDropdown } from '../TokenDropdown'

import { useAccountDetailHook } from './useAccountDetailHook'

import styles from './AccountDetail.module.scss'
import { AccountType, breadcrumbsList, ContractType, TransactionSearchType } from '../../types'
import { calculateValue } from '../../utils/calculateValue'

import { TransactionTable } from '../../transaction'

export const AccountDetail: React.FC = () => {
  const router = useRouter()

  const id = router?.query?.id
  const txType: TransactionSearchType = parseInt(router?.query?.txType as string)

  const siblingCount = 3
  const pageSize = 10

  const { account, accountType, totalTransactions, page, tokens, transactions, setTransactionType, setPage } =
    useAccountDetailHook({
      id: id as string,
      txType,
    })

  const tabs = [
    {
      key: TransactionSearchType.AllExceptInternalTx,
      value: 'Transactions',
      content: (
        <>
          <TransactionTable data={transactions} txType={TransactionSearchType.AllExceptInternalTx} />
          <div className={styles.paginationWrapper}>
            <Pagination
              onPageChange={(p) => setPage(p)}
              totalCount={totalTransactions}
              siblingCount={siblingCount}
              currentPage={page}
              pageSize={pageSize}
            />
          </div>
        </>
      ),
    },
    {
      key: TransactionSearchType.EVM_Internal,
      value: 'Internal Txns',
      content: (
        <>
          <TransactionTable data={transactions} txType={TransactionSearchType.EVM_Internal} />
          <div className={styles.paginationWrapper}>
            <Pagination
              onPageChange={(p) => setPage(p)}
              totalCount={totalTransactions}
              siblingCount={siblingCount}
              currentPage={page}
              pageSize={pageSize}
            />
          </div>
        </>
      ),
    },
    {
      key: TransactionSearchType.ERC_20,
      value: 'ERC-20 Token Txns',
      content: (
        <>
          <TransactionTable data={transactions} txType={TransactionSearchType.ERC_20} />
          <div className={styles.paginationWrapper}>
            <Pagination
              onPageChange={(p) => setPage(p)}
              totalCount={totalTransactions}
              siblingCount={siblingCount}
              currentPage={page}
              pageSize={pageSize}
            />
          </div>
        </>
      ),
    },
    {
      key: TransactionSearchType.ERC_721,
      value: 'ERC-721 Token Txns',
      content: (
        <>
          <TransactionTable data={transactions} txType={TransactionSearchType.ERC_721} />
          <div className={styles.paginationWrapper}>
            <Pagination
              onPageChange={(p) => setPage(p)}
              totalCount={totalTransactions}
              siblingCount={siblingCount}
              currentPage={page}
              pageSize={pageSize}
            />
          </div>
        </>
      ),
    },
    {
      key: TransactionSearchType.ERC_1155,
      value: 'ERC-1155 Token Txns',
      content: (
        <>
          <TransactionTable loading={false} data={transactions} txType={TransactionSearchType.ERC_1155} />
          <div className={styles.paginationWrapper}>
            <Pagination
              onPageChange={(p) => setPage(p)}
              totalCount={totalTransactions}
              siblingCount={siblingCount}
              currentPage={page}
              pageSize={pageSize}
            />
          </div>
        </>
      ),
    },
  ]

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.account]

  const [activeTab, setActiveTab] = useState(tabs[0].key)

  return (
    <div className={styles.AccountDetail}>
      <ContentLayout
        title={
          <div className={styles.header}>
            <div className={styles.title}>
              {accountType === AccountType.NodeAccount2 ? 'Node ID -' : 'Address -'}
              <span>&nbsp;&nbsp;{id}&nbsp;&nbsp;</span>
            </div>
            <CopyButton text={id as string} title="Copy address to clipboard" />
          </div>
        }
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        {account ? (
          <>
            <div className={styles.row}>
              <>
                {accountType === AccountType.Account && account ? (
                  <DetailCard
                    title="Overview"
                    titleRight={
                      account?.contractType &&
                      (account?.contractType as ContractType) !== ContractType.GENERIC ? (
                        <div className={styles.buttonWrapper}>
                          <Button
                            apperance="outlined"
                            className={styles.btn}
                            onClick={() => router.push(`/token/${id}`)}
                          >
                            Token Tracker
                          </Button>
                          <Button
                            apperance="outlined"
                            className={styles.btn}
                            onClick={() => router.push(`/log?address=${id}`)}
                          >
                            Filter By Logs
                          </Button>
                        </div>
                      ) : null
                    }
                    items={[
                      {
                        key: 'Balance :',
                        value: calculateValue(`0x${account?.account?.account?.balance}`) + '   SHM',
                      },
                      {
                        key: 'Nonce :',
                        value:
                          account?.account?.account?.nonce &&
                          web3.utils.hexToNumber(`0x${account?.account?.account?.nonce}`),
                      },
                      {
                        key: 'Tokens :',
                        value: <TokenDropdown tokens={tokens} />,
                      },
                    ]}
                  />
                ) : (
                  <DetailCard
                    title="Overview"
                    items={[
                      {
                        key: 'Node status',
                        value:
                          account?.account?.rewardStartTime > 0 && account?.account?.rewardEndTime === 0
                            ? 'Active'
                            : 'Inactive',
                      },
                      {
                        key: 'Nominator',
                        value: account?.account?.nominator && account?.account?.nominator,
                      },
                      {
                        key: 'StakeLock',
                        value:
                          account?.account?.stakeLock && calculateValue(`0x${account?.account?.stakeLock}`),
                      },
                    ]}
                  />
                )}
                {accountType !== AccountType.Account ? (
                  <DetailCard
                    title="More Info"
                    items={[
                      {
                        key: 'Reward Start Time',
                        value:
                          account?.account?.rewardStartTime &&
                          moment(account?.account?.rewardStartTime * 1000).calendar(),
                      },
                      {
                        key: 'Reward End Time',
                        value:
                          account?.account?.rewardEndTime &&
                          moment(account?.account?.rewardEndTime * 1000).calendar(),
                      },
                      {
                        key: 'Reward',
                        value: account?.account?.reward && calculateValue(`0x${account?.account?.reward}`),
                      },
                      {
                        key: 'Penalty',
                        value: account?.account?.penalty && calculateValue(`0x${account?.account?.penalty}`),
                      },
                    ]}
                  />
                ) : (
                  account?.contractType &&
                  (account?.contractType as ContractType) !== ContractType.GENERIC && (
                    <DetailCard
                      title="More Info"
                      items={[
                        { key: 'Name : ', value: account?.contractInfo?.name },
                        { key: 'Symbol :', value: account?.contractInfo?.symbol },
                        {
                          key: 'Max Total Supply :',
                          value: account?.contractInfo?.totalSupply
                            ? utils
                                .formatUnits(
                                  account?.contractInfo?.totalSupply,
                                  account?.contractInfo?.decimals
                                    ? parseInt(account?.contractInfo?.decimals)
                                    : 18
                                )
                                .toString()
                            : '',
                        },
                      ]}
                    />
                  )
                )}
              </>
            </div>
            <Spacer space="64" />
            {accountType === AccountType.Account ? (
              <Tab
                tabs={tabs}
                activeTab={activeTab}
                onClick={(tab) => {
                  setActiveTab(tab as TransactionSearchType)
                  setTransactionType(tab as TransactionSearchType)
                }}
              />
            ) : (
              <TransactionTable data={transactions} txType={TransactionSearchType.AllExceptInternalTx} />
            )}
          </>
        ) : (
          <>
            <div>Account Not Found!</div>
            <Spacer space="64" />
            <Spacer space="64" />
            <Spacer space="64" />
          </>
        )}
      </ContentLayout>
    </div>
  )
}
