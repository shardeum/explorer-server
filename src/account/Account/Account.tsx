import React, { useState } from "react";

import { useAccount } from "../../api";
import { ContentLayout, Pagination } from "../../components";
import { AccountTable } from "../../components/Table";
import { breadcrumbsList } from "../../types";

import styles from "./Account.module.scss";

const siblingCount = 3;
const limit = 10;

export const Account: React.FC = () => {
  const [page, setPage] = useState(1);

  const { accounts, loading, totalAccounts } = useAccount({ page });

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.account];

  return (
    <div className={styles.Account}>
      <ContentLayout
        title="All Accounts"
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        <AccountTable loading={loading} accounts={accounts} />
        <div className={styles.paginationWrapper}>
          <Pagination
            onPageChange={(p) => setPage(p)}
            totalCount={totalAccounts}
            siblingCount={siblingCount}
            currentPage={page}
            pageSize={limit}
          />
        </div>
      </ContentLayout>
    </div>
  );
};
