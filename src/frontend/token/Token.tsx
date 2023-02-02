import React, { useState } from "react";
import { useRouter } from "next/router";
import Web3Utils from "web3-utils";
import {
  Button,
  ContentLayout,
  CopyButton,
  Spacer,
  TransactionTable,
} from "../components";
import { DetailCard } from "../account/DetailCard";
import { TokenDropdown } from "../account/TokenDropdown";

import { useTokenHook } from "./useTokenHook";

import styles from "./Token.module.scss";
import { breadcrumbsList, ContractType, TransactionSearchType } from "../types";

export const Token: React.FC = () => {
  const router = useRouter();

  const id = router?.query?.id;
  const address = router?.query?.a;

  const { account, total, transactions, tokenHolders} = useTokenHook({
    id: String(id),
    address: String(address),
  });

  const tokenType = account?.contractType === ContractType.ERC_20 ? TransactionSearchType.ERC_20 : account?.contractType === ContractType.ERC_721 ? TransactionSearchType.ERC_721 : account?.contractType === ContractType.ERC_1155 ? TransactionSearchType.ERC_1155 : TransactionSearchType.All

  console.log('tokenType', tokenType)

  const breadcrumbs = [
    breadcrumbsList.dashboard,
    breadcrumbsList.account,
    { to: String(id), label: String(id) },
  ];

  return (
    <div className={styles.Token}>
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
        { account && (
            <div className={styles.row}>
              <DetailCard
                title="Contract Info"
                titleRight={
                  account?.contractType === ContractType.GENERIC && (
                    <div className={styles.buttonWrapper}>
                      <Button
                        apperance="outlined"
                        className={styles.btn}
                        onClick={() => router.push(`/token/${id}?a=${id}`)}
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
                  { key: "Balance :", value: Web3Utils.fromWei(account?.account?.balance, "ether") },
                  { key: "Holders :", value: tokenHolders },
                  { key: "Transfers :", value: total},
                ]}
              />
              {
                account?.contractType && account?.contractType !== ContractType.GENERIC &&
                <DetailCard
                  title="More Info"
                  items={[
                    { key: "Name", value: account?.contractInfo?.name },
                    { key: "Symbol :", value: account?.contractInfo?.symbol },
                    { key: "Total Supply :", value: account?.contractInfo?.totalSupply },
                  ]}
                />

              }
            </div>
        )
      }
        <Spacer space="64" />
        <div className={styles.tableHeader}>
          <div className={styles.title}>Token Transactions</div>
          <div className={styles.search}>
            <input
              type="text"
              placeholder="Filter token txs of by address"
              className={styles.input}
            // value={address}
            // onChange={onAddressChange}
            />
            <Button apperance="primary">Search</Button>
          </div>
        </div>
        <hr />
        <Spacer space="16" />
        <TransactionTable loading={false} data={transactions} txType={tokenType} />
      </ContentLayout>
    </div>
  );
};
