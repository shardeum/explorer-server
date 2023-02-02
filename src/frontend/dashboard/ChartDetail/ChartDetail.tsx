import React from "react";
import { LineChart, BarChart } from "../../components";

import styles from "./ChartDetail.module.scss";

const transactionData = [
  [1506988800000, 0.8509],
  [1507075200000, 0.8485],
  [1507161600000, 0.8517],
  [1507248000000, 0.8543],
  [1507507200000, 0.8515],
  [1507593600000, 0.8478],
  [1507680000000, 0.8454],
  [1507766400000, 0.8436],
  [1507852800000, 0.8468],
  [1508112000000, 0.8473],
];

export const ChartDetail: React.FC = () => {
  return (
    <div className={styles.ChartDetail}>
      <div className={styles.item}>
        <LineChart
          title="SHARDEUM TRANSACTION HISTORY IN 14 DAYS (Mock Data)"
          data={transactionData}
        />
      </div>
      <div className={styles.item}>
        <BarChart title="CYCLES (This chart will be changed)" data={transactionData} />
      </div>
    </div>
  );
};
