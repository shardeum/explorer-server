import React from 'react'
import { useRouter } from 'next/router'

import { useCycleDetail } from '../../api'

import { ContentLayout, PaginationPrevNext } from '../../components'

import styles from './CycleDetail.module.scss'
import { breadcrumbsList } from '../../types'

export const CycleDetail: React.FC = () => {
  const router = useRouter()

  const id = router?.query?.id ? (Array.isArray(router.query.id) ? router.query.id[0] : router.query.id) : '0'

  const { data } = useCycleDetail(id)

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.cycle]

  const onPrev = (): void => {
    router.query.id = String(Number(id) - 1)
    router.push(router)
  }

  const onNext = (): void => {
    router.query.id = String(Number(id) + 1)
    router.push(router)
  }

  return (
    <div className={styles.CycleDetail}>
      <ContentLayout
        title={'Cycle'}
        titleRight={<PaginationPrevNext page={id} onPrev={onPrev} onNext={onNext} />}
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        {data ? (
          <div className={styles.card}>
            <div className={styles.item}>
              <div className={styles.title}>Network ID</div>
              <div className={styles.value}>{data?.cycleRecord?.networkId}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Network State Hash</div>
              <div className={styles.value}>{data?.cycleRecord?.networkStateHash || '-'}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Cycle Number</div>
              <div className={styles.value}>{data?.cycleRecord?.counter}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Cycle Marker</div>
              <div className={styles.value}>{data?.cycleRecord?.marker}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Cycle Start Time</div>
              <div className={styles.value}>{new Date(data?.cycleRecord?.start * 1000).toString()}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Cycle Duration (seconds)</div>
              <div className={styles.value}>{data?.cycleRecord?.duration}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Number of Active Nodes</div>
              <div className={styles.value}>{data?.cycleRecord?.active}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Number of Syncing Nodes</div>
              <div className={styles.value}>{data?.cycleRecord?.syncing}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Expired Nodes</div>
              <div className={styles.value}>{data?.cycleRecord?.expired}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Removed Nodes</div>
              <div className={styles.value}>
                {' '}
                {data?.cycleRecord?.removed?.length > 0
                  ? data?.cycleRecord?.removed?.map((item: string, index: number) => {
                      return <div key={index}>{item}</div>
                    })
                  : '-'}
              </div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Lost Nodes</div>
              <div className={styles.value}>
                {data?.cycleRecord?.lost?.length > 0
                  ? data?.cycleRecord?.lost?.map((item: string, index: number) => {
                      return <div key={index}>{item}</div>
                    })
                  : '-'}
              </div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Returned Nodes</div>
              <div className={styles.value}>
                {data?.cycleRecord?.refuted?.length > 0
                  ? data?.cycleRecord?.refuted?.map((item: string, index: number) => {
                      return <div key={index}>{item}</div>
                    })
                  : '-'}
              </div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Joined Nodes</div>
              <div className={styles.value}>
                {data?.cycleRecord?.joinedConsensors?.length > 0
                  ? data?.cycleRecord?.joinedConsensors?.map((item: { id: string }, index: number) => {
                      return <div key={index}>{item.id}</div>
                    })
                  : '-'}
              </div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Activated Nodes</div>
              <div className={styles.value}>
                {data?.cycleRecord?.activated?.length > 0
                  ? data?.cycleRecord?.activated?.map((item: { id: string }) => {
                      return <div key={item.id}>{item.id}</div>
                    })
                  : '-'}
              </div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Refreshed Archivers</div>
              <div className={styles.value}>
                {data?.cycleRecord?.refreshedArchivers?.length > 0
                  ? data?.cycleRecord?.refreshedArchivers?.map(
                      (item: { publicKey: string }, index: number) => {
                        return <div key={index}>{item.publicKey}</div>
                      }
                    )
                  : '-'}
              </div>
            </div>

            <div className={styles.item}>
              <div className={styles.title}>Refreshed Concensors</div>
              <div className={styles.value}>
                {data?.cycleRecord?.refreshedConsensors?.length > 0
                  ? data?.cycleRecord?.refreshedConsensors?.map((item: { id: string }) => {
                      return <div key={item.id}>{item.id}</div>
                    })
                  : '-'}
              </div>
            </div>
          </div>
        ) : (
          <div> No Data</div>
        )}
      </ContentLayout>
    </div>
  )
}
