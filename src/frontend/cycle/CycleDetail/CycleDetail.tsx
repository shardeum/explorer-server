import React from "react";
import { useRouter } from "next/router";

import { useCycleDetail } from "../../api";

import { ContentLayout, PaginationPrevNext } from "../../components";

import styles from "./CycleDetail.module.scss";
import { breadcrumbsList } from "../../types";

export const CycleDetail: React.FC = () => {
  const router = useRouter();

  const id = router?.query?.id ? router.query.id : '0' as String;

  const { data } = useCycleDetail(id);

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.cycle];

  const onPrev = () => {
    router.query.id = String(Number(id) - 1);
    router.push(router);
  };

  const onNext = () => {
    router.query.id = String(Number(id) + 1);
    router.push(router);
  };

  return (
    <div className={styles.CycleDetail}>
      <ContentLayout
        title={"Cycle"}
        titleRight={
          <PaginationPrevNext page={id} onPrev={onPrev} onNext={onNext} />
        }
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        <div className={styles.card}>
          <div className={styles.item}>
            <div className={styles.title}>Network ID</div>
            <div className={styles.value}>{data?.cycleRecord?.networkId}</div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>Network State Hash</div>
            <div className={styles.value}>
              {data?.cycleRecord?.networkStateHash || "-"}
            </div>
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
            <div className={styles.value}>
              {new Date(data?.cycleRecord?.start * 1000).toString()}
            </div>
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

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Removed Nodes</div>
            <div className={styles.value}>-</div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Returned Nodes</div>
            <div className={styles.value}>-</div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Lost Nodes</div>
            <div className={styles.value}>-</div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Joined Nodes</div>
            <div className={styles.value}>-</div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Activated Nodes</div>
            <div className={styles.value}>-</div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Activated Public Keys</div>
            <div className={styles.value}>-</div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Refreshed Archivers</div>
            <div className={styles.value}>
              758b1c119412298802cd28dbfa394cdfeecc4074492d60844cc192d632d84de3
            </div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Refreshed Concensors</div>
            <div className={styles.value}>
              de366f3148e3bc06096f7ed8952d213cb09ec47e34d78b7c9bbbcfd241948c39
            </div>
          </div>

          {/* TODO: calculate removed nodes data?.cycleRecord?.removed */}
          <div className={styles.item}>
            <div className={styles.title}>Partition Blocks</div>
            <div className={styles.value}>-</div>
          </div>
        </div>
      </ContentLayout>
    </div>
  );
};
