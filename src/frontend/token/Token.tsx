import React from 'react'
import { useRouter } from 'next/router'
import Web3Utils from 'web3-utils'
import { utils } from 'ethers'

import { AnchorLink, Button, ContentLayout, CopyButton, Spacer, Tab, Table } from '../components'
import { DetailCard } from '../account/DetailCard'
import { TransactionTable } from '../transaction'
import { breadcrumbsList, ContractType, TransactionSearchType } from '../types'

import { useTokenHook } from './useTokenHook'

import styles from './Token.module.scss'

export const Token: React.FC = () => {
  const router = useRouter()

  const id = router?.query?.id
  const address = router?.query?.a

  const {
    account,
    total,
    transactions,
    tokenHolders,
    tokens,
    filteredAddress,
    onAddressChange,
    activeTab,
    onTabChange,
    tokenBalance,
  } = useTokenHook({
    id: String(id),
    address: address?.toString(),
  })

  const tokenType =
    account?.contractType === ContractType.ERC_20
      ? TransactionSearchType.ERC_20
      : account?.contractType === ContractType.ERC_721
      ? TransactionSearchType.ERC_721
      : account?.contractType === ContractType.ERC_1155
      ? TransactionSearchType.ERC_1155
      : TransactionSearchType.AllExceptInternalTx

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.account]

  const header = [
    {
      key: 'ethAddress',
      value: 'Address',
      render: (val: unknown) => (
        <AnchorLink href={`/token/${id}/?a=${val}`} label={val as unknown as string} size="small" />
      ),
    },
    {
      key: 'tokenValue',
      value: 'Quantity',
      render: (val: unknown) => (
        <>
          {' '}
          {val
            ? utils
                .formatUnits(
                  val as number,
                  account?.contractInfo?.decimals ? parseInt(account?.contractInfo?.decimals) : 18
                )
                .toString()
            : ''}
        </>
      ),
    },
  ]

  const tabs = [
    {
      key: TransactionSearchType.AllExceptInternalTx as number,
      value: 'Transfer',
      content: <TransactionTable data={transactions} txType={tokenType} />,
    },
    {
      key: 'holder',
      value: 'Holder',
      content: <Table columns={header} data={tokens} />,
    },
  ]

  return (
    <div className={styles.Token}>
      <ContentLayout
        title={
          <div className={styles.header}>
            <div className={styles.title}>
              Address <span>&nbsp;&nbsp;{id}&nbsp;&nbsp;</span>
            </div>
            <CopyButton text={id as string} title="Copy address to clipboard" />
          </div>
        }
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        {account && (
          <div className={styles.row}>
            <>
              <DetailCard
                title="Contract Info"
                titleRight={
                  account?.contractType === ContractType.GENERIC && (
                    <div className={styles.buttonWrapper}>
                      <Button
                        apperance="outlined"
                        className={styles.btn}
                        onClick={() => router.push(`/token/${id}?a=${id}`)}
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
                  )
                }
                items={[
                  {
                    key: 'Balance :',
                    value: Web3Utils.fromWei(account?.account?.balance, 'ether'),
                  },
                  {
                    key: 'Max Total Supply :',
                    value: account?.contractInfo?.totalSupply
                      ? utils
                          .formatUnits(
                            account?.contractInfo?.totalSupply,
                            account?.contractInfo?.decimals ? parseInt(account?.contractInfo?.decimals) : 18
                          )
                          .toString()
                      : '',
                  },
                  { key: 'Holders :', value: tokenHolders },
                  { key: 'Transfers :', value: total },
                ]}
              />
              {account?.contractType && (account?.contractType as ContractType) !== ContractType.GENERIC && (
                <DetailCard
                  title="More Info"
                  items={[
                    { key: 'Name', value: account?.contractInfo?.name },
                    { key: 'Symbol :', value: account?.contractInfo?.symbol },
                    {
                      key: 'Max Total Supply :',
                      value: account?.contractInfo?.totalSupply
                      ? utils
                          .formatUnits(
                            account?.contractInfo?.totalSupply,
                            account?.contractInfo?.decimals ? parseInt(account?.contractInfo?.decimals) : 18
                          )
                          .toString()
                      : '',
                    },
                  ]}
                />
              )}
            </>
          </div>
        )}
        <Spacer space="64" />
        <div className={styles.tableHeader}>
          <div className={styles.title}>Token Transactions</div>
          <div className={styles.search}>
            <input
              type="text"
              placeholder="Filter token txs of by address"
              className={styles.input}
              value={filteredAddress}
              onChange={onAddressChange}
            />
            <Button apperance="primary">Search</Button>
          </div>
        </div>

        {filteredAddress && (
          <div className={styles.filter}>
            <div>
              <div className={styles.title}>FILTERED BY TOKEN HOLDER</div>
              <AnchorLink href={`/address/${filteredAddress}`} label={filteredAddress} size="small" />
            </div>
            <div className={styles.divider} />
            <div>
              <div className={styles.title}>BALANCE</div>
              <div className={styles.value}>
                {tokenBalance
                  ? utils
                      .formatUnits(
                        tokenBalance,
                        account?.contractInfo?.decimals ? parseInt(account?.contractInfo?.decimals) : 18
                      )
                      .toString()
                  : ''}
              </div>
            </div>
          </div>
        )}
        <Spacer space="16" />
        <Tab tabs={tabs} activeTab={activeTab} onClick={onTabChange} />
      </ContentLayout>
    </div>
  )
}
