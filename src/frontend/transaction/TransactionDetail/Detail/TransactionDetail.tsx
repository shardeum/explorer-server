import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import { useTransactionDetail, useReceiptDetail } from '../../../api'
import { ContentLayout } from '../../../components'
import { Tab } from '../../../components/Tab'
import { Transaction, breadcrumbsList } from '../../../types'
import { JsonView } from '../JsonView'
import { Ovewview } from '../Overview'
import { Receipt } from '../Receipt'
import { AccountInfo } from '../AccountInfo'

import styles from './TransactionDetail.module.scss'
import { useTransactionDetailHook } from './useTransactionDetailHook'

export const TransactionDetail: React.FC = () => {
  const router = useRouter()

  const id = router?.query?.id as string

  const { transactionData, receiptData, setShowReceipt, showReceipt } = useTransactionDetailHook(id)

  // const receipt = router?.query?.receipt === 'true' ? true : false

  // const { data: transactionData } = useTransactionDetail(router?.query?.id as string)
  // let receiptData = {} as any
  // if (receipt) {
  //   const { data} = useReceiptDetail(router?.query?.id as string)
  //   receiptData = data?.receiptData
  // }

  // let transactionData = {} as Transaction
  // let receiptData = {} as any
  // if (showReceipt) {
  //   const { data } = useReceiptDetail(router?.query?.id as string)
  //   transactionData = data?.receiptData
  //   receiptData = data?.receiptData
  // } else {
  //   const { data } = useTransactionDetail(router?.query?.id as string)
  //   transactionData = data
  // }

  // const { data } = useReceiptDetail(router?.query?.id as string)
  // let transactionData = data?.transactionData
  // let receiptData = data?.receiptData

  useEffect(() => {
    const receipt = router?.query?.receipt === 'true' ? true : false
    setShowReceipt(receipt)
    setActiveTab(receipt ? receiptTabs[0].key : tabs[0].key)
  }, [router?.query?.receipt])

  const tabs = [
    {
      key: 'overview',
      value: 'Overview',
      content: <Ovewview transaction={transactionData} />,
    },
    // {
    //   key: "logs",
    //   value: "Logs",
    //   content: <Logs transaction={data} />,
    // },
    {
      key: 'jsonview',
      value: 'Json View',
      content: <JsonView transaction={transactionData} />,
    },
  ]

  const receiptTabs = [
    {
      key: 'fullReceipt',
      value: 'Full Receipt',
      content: <Receipt receipt={receiptData} />,
    },
    {
      key: 'accountInfo',
      value: 'Account Info',
      content: <AccountInfo receipt={receiptData} />,
    },
  ]

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.transaction]

  const [activeTab, setActiveTab] = useState(showReceipt ? receiptTabs[0].key : tabs[0].key)

  return (
    <div className={styles.TransactionDetail}>
      <ContentLayout title="Transaction Details" showBackButton breadcrumbItems={breadcrumbs}>
        <Tab
          tabs={showReceipt ? receiptTabs : tabs}
          activeTab={activeTab}
          onClick={(tab) => setActiveTab(tab)}
        />
      </ContentLayout>
    </div>
  )
}
