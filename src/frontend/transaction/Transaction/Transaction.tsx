import React, { useState } from "react";
import { useRouter } from "next/router";

import { useTransaction } from "../../api";

import {
  ContentLayout,
  Dropdown,
  Pagination,
  PaginationPrevNext,
  TransactionTable,
} from "../../components";
import { breadcrumbsList, TransactionSearchList } from "../../types";

import styles from "./Transaction.module.scss";

export const Transaction: React.FC = () => {
  const router = useRouter();

  const txType = Number(router?.query?.txType);

  const tType = txType
    ? TransactionSearchList.filter((t) => t.key === txType)[0]
    : TransactionSearchList[0];

  const [transactionType, setTransactionType] = useState(tType);

  const [currentPage, setCurrentPage] = useState(1);
  const siblingCount = 3;
  const pageSize = 10;

  const { transactions, totalTransactions, loading } = useTransaction({
    page: currentPage,
    txType: transactionType.key,
  });

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.transaction];

  const onNext = () => {
    const totalPage = Math.ceil(totalTransactions / 10);

    setCurrentPage(currentPage < totalPage ? currentPage + 1 : totalPage);
  };

  const onPrev = () => {
    setCurrentPage(currentPage > 1 ? currentPage - 1 : 1);
  };

  return (
    <div className={styles.Transaction}>
      <ContentLayout
        title="All Transactions"
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        <div className={styles.wrapper}>
          <Dropdown
            apperance="outlined"
            size="medium"
            items={TransactionSearchList.map((t) => t.value)}
            selected={transactionType.value}
            onSelect={(t) => {
              setTransactionType(
                TransactionSearchList.filter((i) => i.value === t)[0]
              );
              setCurrentPage(1);
            }}
            buttonClassName={styles.button}
            onHoverOpen
          />
          <PaginationPrevNext
            onNext={onNext}
            onPrev={onPrev}
            page={currentPage}
          />
        </div>
        <TransactionTable
          loading={loading}
          data={transactions}
          txType={transactionType.key}
        />
        <div className={styles.paginationWrapper}>
          <Pagination
            onPageChange={(p) => setCurrentPage(p)}
            totalCount={totalTransactions}
            siblingCount={siblingCount}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        </div>
      </ContentLayout>
    </div>
  );
};
