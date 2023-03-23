import Link from "next/link";
import React from "react";

import { Icon } from "../../components";

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
  totalStakedSHM: number;
  totalSHM: number;
}

export const CardDetail: React.FC<CardDetailProps> = (data) => {
  return (
    <div className={styles.CardDetail}>
      <div className={styles.column}>
        <div className={styles.item}>
          <Link href="/cycle">
            <div className={styles.icon}>
              <Icon name="cycle" size="medium" color="primary" />
            </div>
          </Link>
          <div>
            <p className={styles.title}>Total Cycles</p>
            <p>{data?.totalCycles?.toLocaleString("en-US")}</p>
          </div>
        </div>
        <hr />
        <div className={styles.item}>
          <div className={styles.icon}>
            <Icon name="node" size="medium" color="primary" />
          </div>
          <div>
            <p className={styles.title}>Active Validators</p>
            <p>{data?.totalNodes?.toLocaleString("en-US")}</p>
          </div>
        </div>
      </div>
      <div className={styles.column}>
        <div className={styles.item}>
          <Link href="/account">
            <div className={styles.icon}>
              <Icon name="account" size="medium" color="primary" />
            </div>
          </Link>
          <div>
            <p className={styles.title}>Total Accounts</p>
            <p>{data?.totalAccounts?.toLocaleString("en-US")}</p>
          </div>
        </div>
        <hr />
        <div className={styles.item}>
          <Link href="/contract">
            <div className={styles.icon}>
              <Icon name="contract" size="medium" color="primary" />
            </div>
          </Link>
          <div>
            <p className={styles.title}>Total Contracts</p>
            <p>{data?.totalContracts?.toLocaleString("en-US")}</p>
          </div>
        </div>
      </div>
      <div className={styles.column}>
        <div className={styles.item}>
          <Link href="/transaction">
            <div className={styles.icon}>
              <Icon name="transaction" size="medium" color="primary" />
            </div>
          </Link>
          <div>
            <p className={styles.title}>Total Transactions</p>
            <p>{data?.totalTransactions?.toLocaleString("en-US")}</p>
          </div>
        </div>
        <hr />
        <div className={styles.item}>
          <Link href="/transaction">
            <div className={styles.icon}>
              <Icon name="transaction" size="medium" color="primary" />
            </div>
          </Link>
          <div>
            <p className={styles.title}>Total Stake / Unstake Transactions</p>
            <p>{data?.totalStakeTxs?.toLocaleString("en-US")} / {data?.totalUnstakeTxs?.toLocaleString("en-US")}</p>
          </div>
        </div>
      </div>
      <div className={styles.column}>
        <div className={styles.item}>
          <Link href="/transaction">
            <div className={styles.icon}>
              <Icon name="reward" size="medium" color="primary" />
            </div>
          </Link>
          <div>
            <p className={styles.title}>Total SHM</p>
            <p>{data?.totalSHM?.toLocaleString("en-US")}</p>
          </div>
        </div>
        <hr />
        <div className={styles.item}>
          <Link href="/transaction">
            <div className={styles.icon}>
              <Icon name="reward" size="medium" color="primary" />
            </div>
          </Link>
          <div>
            <p className={styles.title}>Total Stake SHM</p>
            <p>{data?.totalStakedSHM?.toLocaleString("en-US")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
