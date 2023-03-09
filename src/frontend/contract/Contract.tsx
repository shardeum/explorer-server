import moment from "moment";
import React, { Fragment, useState } from "react";

import { useContract } from "../api";

import { AnchorLink, ContentLayout, Dropdown, Pagination } from "../components";
import { ContractTable } from "../components/Table";
import { Table } from "../components/TableComp";
import { breadcrumbsList, contractTypes } from "../types";

import styles from "./Contract.module.scss";

const header = [
  {
    key: "accountId",
    value: "Contract Address",
    render: (val: unknown, item: any) => (
      <AnchorLink
        href={`/account/${item?.ethAddress}`}
        label={val as string}
        size="small"
        width={300}
        ellipsis
      />
    ),
  },
  {
    key: "timestamp",
    value: "Last Used",
    render: (val: unknown) => moment(val as string).fromNow(),
  },
];

export const Contract: React.FC = () => {
  const [selected, setSelected] = useState(contractTypes[0]);
  const [page, setPage] = useState(1);

  const { data, loading, total } = useContract({
    page,
    type: selected.key,
  });

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.contract];

  return (
    <div className={styles.Contract}>
      <ContentLayout
        title="Contract Address"
        titleRight={
          <div className={styles.title}>Number of Contracts - {total}</div>
        }
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        {loading ? (
          <div>Loading...</div>
        ) : data && data.length > 0 ? (
          <Fragment>
            <Dropdown
              items={contractTypes.map((t) => t.value)}
              apperance="outlined"
              selected={selected.value}
              onSelect={(t) => {
                setSelected(contractTypes.filter((i) => i.value === t)[0]);
                setPage(1);
              }}
              className={styles.dropdown}
              buttonClassName={styles.button}
              onHoverOpen
            />
            <Table columns={header} data={data} />
            <div className={styles.paginationWrapper}>
              <Pagination
                onPageChange={(p) => setPage(p)}
                totalCount={total}
                siblingCount={3}
                currentPage={page}
                pageSize={10}
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
