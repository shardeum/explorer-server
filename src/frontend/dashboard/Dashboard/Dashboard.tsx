import React from "react";
import moment from "moment";

import { CardDetail } from "../CardDetail";
import { LatestTable } from "../LatestTable";
import { SearchBox } from "../SearchBox";
import { Spacer } from "../../components";

import { useCycle, useTransaction, useAccount, useStats } from "../../api";

import styles from "./Dashboard.module.scss";
import { ChartDetail } from "../ChartDetail";
import { TransactionSearchType, AccountSearchType } from "../../types";

export const Dashboard: React.FC = () => {
  const { data: cycles, loading: cycleLoading } = useCycle({ count: 10 });
  const { transactions, totalRewardTxs, totalStakeTxs, totalUnstakeTxs, totalTransactions, loading: transactionLoading } = useTransaction({
    count: 10, txType: TransactionSearchType.StakeReceipt
  });

  const { totalAccounts, totalContracts } = useAccount({ count: 10, type: AccountSearchType.CA });

  // const { validatorStats, transactionStats } = useStats({ count: 5000});

  const cyclesList = cycles.map((row) => {
    return {
      key: row?.cycleRecord?.counter || "",
      value: moment(row?.cycleRecord?.start * 1000).calendar(),
      activeNodes: (row?.cycleRecord?.active) || 0
    };
  });

  const transactionsList = transactions.map((row) => {
    return {
      key: "Tx Hash",
      value: row?.txHash,
    };
  });

  return (
    <div className={styles.Dashboard}>
      <Spacer space="32" />
      <session>
        <SearchBox />
      </session>
      <Spacer space="64" />
      <session>
        <CardDetail totalCycles={cyclesList[0]?.key} totalNodes={cyclesList[0]?.activeNodes} totalAccounts={totalAccounts} totalContracts={totalContracts} totalTransactions={totalTransactions} totalRewardTxs={totalRewardTxs} totalStakeTxs={totalStakeTxs} totalUnstakeTxs={totalUnstakeTxs}/>
      </session>
      <Spacer space="64" />
      {/* <section>
        <ChartDetail validatorStats={validatorStats} transactionStats={transactionStats}/>
      </section> */}
      <Spacer space="64" />
      <session>
        <div className={styles.tableGrid}>
          <LatestTable
            title="Latest Cycles"
            name="View All Cycles"
            data={cyclesList}
            type="cycle"
            loading={cycleLoading}
          />
          <LatestTable
            title="Latest Transactions"
            name="View All Transactions"
            data={transactionsList}
            type="transaction"
            loading={transactionLoading}
          />
        </div>
      </session>
    </div>
  );
};
