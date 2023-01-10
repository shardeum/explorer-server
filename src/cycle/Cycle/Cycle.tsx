import React from "react";
import { ContentLayout, CycleTable, Pagination } from "../../components";
import { breadcrumbsList } from "../../types";

import styles from "./Cycle.module.scss";
import { useCycleHook } from "./useCycleHook";

export const Cycle: React.FC = () => {
  const { cycles, loading, page, setPage, limit, totalCycle } = useCycleHook();

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.cycle];

  return (
    <div className={styles.Cycle}>
      <ContentLayout
        title="All Cycles"
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        <CycleTable cycles={cycles} loading={loading} />
        <div className={styles.paginationWrapper}>
          <Pagination
            onPageChange={(p) => setPage(p)}
            totalCount={totalCycle}
            siblingCount={2}
            currentPage={page}
            pageSize={limit}
          />
        </div>
      </ContentLayout>
    </div>
  );
};
