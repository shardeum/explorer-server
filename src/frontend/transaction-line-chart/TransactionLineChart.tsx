import React from "react";

import { ContentLayout, LineStockChart } from "../components";

import styles from "./TransactionLineChart.module.scss";
import { useStats } from "../api";

export const TransactionLineChart: React.FC = () => {
  const height = 600;

  const { validatorStats, transactionStats, loading } = useStats({
    transactionStatsCount: 10000000,
  });
  return (
    <div className={styles.TransactionLineChart}>
      <ContentLayout title="Transactions per Cycle Chart">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <LineStockChart
            title="Transactions per Cycle Chart"
            centerTitle
            subTitle="Click and drag in the plot area to zoom in"
            height={height}
            data={transactionStats}
            name="Transactions"
          />
        )}
      </ContentLayout>
    </div>
  );
};
