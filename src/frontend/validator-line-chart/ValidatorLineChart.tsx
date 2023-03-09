import React from "react";

import { ContentLayout, LineStockChart } from "../components";

import styles from "./ValidatorLineChart.module.scss";
import { useStats } from "../api";

export const ValidatorLineChart: React.FC = () => {
  const height = 600;

  const { validatorStats, transactionStats, loading } = useStats({
    validatorStatsCount: 10000000,
  });

  return (
    <div className={styles.ValidatorLineChart}>
      <ContentLayout title="Active Validators per Cycle Chart">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <LineStockChart
            title="Active Validators per Cycle Chart"
            centerTitle
            subTitle="Click and drag in the plot area to zoom in"
            height={height}
            data={validatorStats}
            name="Validators"
          />
        )}
      </ContentLayout>
    </div>
  );
};
