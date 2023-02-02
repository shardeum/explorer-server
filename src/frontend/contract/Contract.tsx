import React, { useState } from "react";

import { useContract } from "../api";

import { ContentLayout, Dropdown, Pagination } from "../components";
import { ContractTable } from "../components/Table";
import { breadcrumbsList, contractTypes } from "../types";

import styles from "./Contract.module.scss";

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
        <ContractTable contracts={data} loading={loading} />
        <div className={styles.paginationWrapper}>
          <Pagination
            onPageChange={(p) => setPage(p)}
            totalCount={total}
            siblingCount={3}
            currentPage={page}
            pageSize={10}
          />
        </div>
      </ContentLayout>
    </div>
  );
};
