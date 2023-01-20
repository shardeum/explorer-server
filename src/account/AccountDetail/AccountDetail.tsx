import React, { useState } from "react";
import { useRouter } from "next/router";
import Web3Utils from "web3-utils";
import {
  Button,
  ContentLayout,
  CopyButton,
  Spacer,
  TransactionTable,
} from "../../components";
import { Tab } from "../../components/Tab";
import { DetailCard } from "../DetailCard";
import { TokenDropdown } from "../TokenDropdown";

import { useAccountDetailHook } from "./useAccountDetailHook";

import styles from "./AccountDetail.module.scss";
import {
  AccountType,
  breadcrumbsList,
  ContractType,
  TransactionSearchType,
} from "../../types";
import { calculateValue } from "../../utils/calculateValue";

//http://localhost:3000/account/0xb246b7d28b0f9a3c0ce9e8e15590aeb837bc9392

export const AccountDetail: React.FC = () => {
  const router = useRouter();

  const id = router?.query?.id;
  const txType = router?.query?.txType as unknown as TransactionSearchType;

  const {
    account,
    accountType,
    total,
    tokens,
    transactions,
    setTransactionType,
  } = useAccountDetailHook({
    id: id as string,
    txType: txType,
  });

  const tabs = [
    {
      key: TransactionSearchType.All,
      value: "Transactions",
      content: (
        <TransactionTable
          loading={false}
          data={transactions}
          txType={TransactionSearchType.All}
        />
      ),
    },
    {
      key: TransactionSearchType.Internal,
      value: "Internal Txns",
      content: (
        <TransactionTable
          loading={false}
          data={transactions}
          txType={TransactionSearchType.Internal}
        />
      ),
    },
    {
      key: TransactionSearchType.ERC_20,
      value: "ERC-20 Token Txns",
      content: (
        <TransactionTable
          loading={false}
          data={transactions}
          txType={TransactionSearchType.ERC_20}
        />
      ),
    },
    {
      key: TransactionSearchType.ERC_721,
      value: "ERC-721 Token Txns",
      content: (
        <TransactionTable
          loading={false}
          data={transactions}
          txType={TransactionSearchType.ERC_721}
        />
      ),
    },
    {
      key: TransactionSearchType.ERC_1155,
      value: "ERC-1155 Token Txns",
      content: (
        <TransactionTable
          loading={false}
          data={transactions}
          txType={TransactionSearchType.ERC_1155}
        />
      ),
    },
  ];

  const breadcrumbs = [breadcrumbsList.dashboard, breadcrumbsList.account];

  const [activeTab, setActiveTab] = useState(tabs[0].key);

  return (
    <div className={styles.AccountDetail}>
      <ContentLayout
        title={
          <div className={styles.header}>
            <div className={styles.title}>
              Address - <span>&nbsp;&nbsp;{id}&nbsp;&nbsp;</span>
            </div>
            <CopyButton text={id as string} title="Copy address to clipboard" />
          </div>
        }
        breadcrumbItems={breadcrumbs}
        showBackButton
      >
        {account ? (
          <>
            <div className={styles.row}>
              {accountType === AccountType.Account && account ? (
                <DetailCard
                  title="Overview"
                  titleRight={
                    account?.contractType &&
                    account?.contractType !== ContractType.GENERIC && (
                      <div className={styles.buttonWrapper}>
                        <Button
                          apperance="outlined"
                          className={styles.btn}
                          onClick={() => router.push(`/token/${id}`)}
                        >
                          Token Tracker
                        </Button>
                        <Button
                          apperance="outlined"
                          className={styles.btn}
                          onClick={() => router.push(`/log?address=${id}`)}
                        >
                          Filter By Logs
                        </Button>
                      </div>
                    )
                  }
                  items={[
                    {
                      key: "Balance :",
                      value:
                        calculateValue(account?.account?.balance) +
                        "   SHM",
                    },
                    {
                      key: "Nonce :",
                      value: Web3Utils.hexToNumber(
                        "0x" + account?.account?.nonce
                      ),
                    },
                    {
                      key: "Tokens :",
                      value: <TokenDropdown tokens={tokens} />,
                    },
                  ]}
                />
              ) : (
                <DetailCard
                  title="Overview"
                  items={[
                    {
                      key: "Node status",
                      value: account?.account?.rewardStartTime
                        ? "Active"
                        : "Non-Active",
                    },
                    {
                      key: "Nominator",
                      value:
                        account?.account?.nominator &&
                        account?.account?.nominator,
                    },
                    {
                      key: "StakeLock",
                      value:
                        account?.account?.stakeLock &&
                        account?.account?.stakeLock,
                    },
                  ]}
                />
              )}
              {accountType !== AccountType.Account ? (
                <DetailCard
                  title="More Info"
                  items={[
                    { key: "Reward Start Time", value: account?.account?.rewardStartTime },
                    { key: "Reward End Time", value: account?.account?.rewardEndTime },
                    {
                      key: "Reward",
                      value: account?.account?.reward,
                    },
                  ]}
                />
              ) : (
                account?.contractType &&
                account?.contractType !== ContractType.GENERIC && (
                  <DetailCard
                    title="More Info"
                    items={[
                      { key: "Name : ", value: account?.contractInfo?.name },
                      { key: "Symbol :", value: account?.contractInfo?.symbol },
                      {
                        key: "Total Supply :",
                        value: account?.contractInfo?.totalSupply,
                      },
                    ]}
                  />
                )
              )}
            </div>
            <Spacer space="64" />
            {accountType === AccountType.Account ? (
              <Tab
                tabs={tabs}
                activeTab={activeTab}
                onClick={(tab) => {
                  setActiveTab(tab);
                  setTransactionType(tab);
                }}
              />
            ) : (
              <TransactionTable
                loading={false}
                data={transactions}
                txType={TransactionSearchType.All}
              />
            )}
          </>
        ) : (
          <>
            <div>Account Not Found!</div>
            <Spacer space="64" />
            <Spacer space="64" />
            <Spacer space="64" />
          </>
        )}
      </ContentLayout>
    </div>
  );
};
