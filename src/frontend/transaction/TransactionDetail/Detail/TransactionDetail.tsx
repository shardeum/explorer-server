import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { useTransactionDetail } from '../../../api'
import { ContentLayout } from '../../../components'
import { Tab } from '../../../components/Tab'
import { breadcrumbsList } from '../../../types'
import { JsonView } from '../JsonView'
import { Ovewview } from '../Overview'

import styles from './TransactionDetail.module.scss'

export const TransactionDetail: React.FC = () => {
  const router = useRouter()

  const { data } = useTransactionDetail(router?.query?.id as string)

  const tabs = [
    {
      key: 'overview',
      value: 'Overview',
      content: <Ovewview transaction={data} />,
    },
    // {
    //   key: "logs",
    //   value: "Logs",
    //   content: <Logs transaction={data} />,
    // },
    {
      key: 'jsonview',
      value: 'Json View',
      content: <JsonView transaction={data} />,
    },
  ]

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.transaction]

  const [activeTab, setActiveTab] = useState(tabs[0].key)

  return (
    <div className={styles.TransactionDetail}>
      <ContentLayout title="Transaction Details" showBackButton breadcrumbItems={breadcrumbs}>
        <Tab tabs={tabs} activeTab={activeTab} onClick={(tab) => setActiveTab(tab as string)} />
      </ContentLayout>
    </div>
  )
}
