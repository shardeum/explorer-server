import moment from "moment";
import React, { Fragment } from "react";
import { AnchorLink, ContentLayout, Pagination } from "../../components";
import { Table } from "../../components/TableComp";
import { breadcrumbsList } from "../../types";

import styles from "./Cycle.module.scss";
import { useCycleHook } from "./useCycleHook";

const header = [
  {
    key: "cycleRecord.counter",
    value: "Count",
    render: (val: unknown, item: any) => (
      <AnchorLink
        href={`/cycle/${item?.counter}`}
        label={val as unknown as string}
        size="small"
      />
    ),
  },
  {
    key: "cycleRecord.start",
    value: "Timestamp",
    render: (val: unknown) =>
      moment(parseInt(val as unknown as string, 10) * 1000).calendar(),
  },
];

export const Cycle: React.FC = () => {
  const { cycles, loading, page, setPage, limit, totalCycle } = useCycleHook();

  const breadcrumbs = [breadcrumbsList.dashboard];

  return (
    <div className={styles.Cycle}>
      <ContentLayout
        title="All Cycles"
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
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
  );
};
