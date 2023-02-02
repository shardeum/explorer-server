import React from "react";
import { useTotalData } from "../../api";

import { Card, Icon } from "../../components";
import { TransactionSearchType } from "../../types";

import styles from "./CardDetail.module.scss";

export interface CardDetailProps {
  totalCycles: string | number;
  totalNodes: string | number;
  totalTransactions: string;
  totalRewardTxs: string;
  totalStakeTxs: string;
  totalUnstakeTxs: string;
  totalAccounts: string;
  totalContracts: string;
}

export const CardDetail: React.FC<CardDetailProps> = (data) => {
  // const { data } = useTotalData();

  // TODO: Active Node Data, Total Reward Transactions, Total Contracts

  return (
    <div className={styles.CardDetail}>
      <Card
        title="Total Cycles"
        count={data?.totalCycles}
        color="primary"
        icon={<Icon name="cycle" size="medium" color="white" />}
        href="/cycle"
      />
      <Card
        title="Active Nodes"
        count={data?.totalNodes}
        color="warn"
        icon={<Icon name="node" size="medium" color="white" />}
        href="/"
      />
      <Card
        title="Total Accounts"
        count={data?.totalAccounts}
        color="info"
        icon={<Icon name="account" size="medium" color="white" />}
        href="/account"
      />
      <Card
        title="Total Contracts"
        count={data?.totalContracts}
        color="success"
        icon={<Icon name="contract" size="medium" color="white" />}
        href="/contract"
      />
      <Card
        title="Total Transactions"
        count={data?.totalTransactions}
        color="secondary"
        icon={<Icon name="transaction" size="medium" color="white" />}
        href="/transaction"
      />
      {/* <Card
        title="Total Reward Transactions"
        count={data?.totalRewardTxs}
        color="error"
        icon={<Icon name="reward" size="medium" color="white" />}
        href="/transaction?txType=2"
      /> */}
      <Card
        title="Total Stake Transactions"
        count={data?.totalStakeTxs}
        color="primary"
        icon={<Icon name="cycle" size="medium" color="white" />}
        href={`/transaction?txType=${TransactionSearchType.StakeReceipt}`}
      />
      <Card
        title="Total Unstake Transactions"
        count={data?.totalUnstakeTxs}
        color="primary"
        icon={<Icon name="cycle" size="medium" color="white" />}
        href={`/transaction?txType=${TransactionSearchType.UnstakeReceipt}`}
      />
      <Card
        title="Total Stake Amount"
        count={'WIP'}
        color="primary"
        icon={<Icon name="cycle" size="medium" color="white" />}
        href={`/transaction`}
      />
    </div>
  );
};
