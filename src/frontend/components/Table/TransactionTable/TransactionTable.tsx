import Link from "next/link";
import moment from "moment";

import { Transaction, TransactionSearchType } from "../../../types";

import { Chip } from "../../Chip";

import styles from "./TransactionTable.module.scss";
import { showTxMethod } from "../../../utils/showMethod";
import {
  calculateValue,
  calculateTokenValue,
  short,
} from "../../../utils/calculateValue";

import { useEffect, useState } from "react";
import { Spacer } from "../../Spacer";
import { toReadableDateFromMillis } from "../../../../utils/time";

interface TransactionTableProps {
  data: Transaction[];
  txType?: TransactionSearchType;
  loading?: boolean;
}

const headersList = [
  "Txn Hash",
  "Method",
  "Cycle",
  "Timestamp",
  "From",
  "To",
  "Value",
  "Txn Fee",
];

export const TransactionTable: React.FC<TransactionTableProps> = ({
  data,
  loading,
  txType,
}) => {
  const [header, setHeader] = useState(headersList);

  useEffect(() => {
    if (
      txType === TransactionSearchType.All ||
      txType === TransactionSearchType.NodeRewardReceipt ||
      txType === TransactionSearchType.Internal ||
      txType === TransactionSearchType.StakeReceipt ||
      txType === TransactionSearchType.UnstakeReceipt
    ) {
      setHeader([
        "Txn Hash",
        "Method",
        "Cycle",
        "Timestamp",
        "From",
        "To",
        "Value",
        "Txn Fee",
      ]);
    }
    if (txType === TransactionSearchType.ERC_1155) {
      setHeader([
        "Txn Hash",
        "Method",
        "Cycle",
        "Timestamp",
        "From",
        "To",
        "Value",
        "Token",
        "Token ID",
        "Txn Fee",
      ]);
    }
    if (txType === TransactionSearchType.ERC_20) {
      setHeader([
        "Txn Hash",
        "Method",
        "Cycle",
        "Timestamp",
        "From",
        "To",
        "Value",
        "Token",
        "Txn Fee",
      ]);
    }
    if (txType === TransactionSearchType.ERC_721) {
      setHeader([
        "Txn Hash",
        "Method",
        "Cycle",
        "Timestamp",
        "From",
        "To",
        "Token ID",
        "Token",
        "Txn Fee",
      ]);
    }
    if (txType === TransactionSearchType.ERC_1155) {
      setHeader([
        "Txn Hash",
        "Method",
        "Cycle",
        "Timestamp",
        "From",
        "To",
        "Token ID",
        "Value",
        "Token",
        "Txn Fee",
      ]);
    }
  }, [txType]);

  if (data?.length < 1) {
    return (
      <div>
        <Spacer space="8" />
        No Data
        <Spacer space="64" />
      </div>
    );
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  // TODO: calculate value, fee, token, token id

  const renderColumn = (row: any) => {
    if (
      txType === TransactionSearchType.All ||
      txType === TransactionSearchType.NodeRewardReceipt ||
      txType === TransactionSearchType.StakeReceipt ||
      txType === TransactionSearchType.UnstakeReceipt
    ) {
      return (
        <>
          <td>
            <Link
              href={`/account/${row?.wrappedEVMAccount?.readableReceipt?.from}`}
              className={styles.link}
            >
              {row?.wrappedEVMAccount?.readableReceipt?.from}
            </Link>
          </td>
          <td>
            {row?.nominee ? (
              <Link
                href={`/account/${row?.nominee}`}
                className={styles.link}
              >
                {row?.nominee}{" "}
              </Link>
            ) : row?.wrappedEVMAccount?.readableReceipt?.to ? (
              <Link
                href={`/account/${row?.wrappedEVMAccount?.readableReceipt?.to}`}
                className={styles.link}
              >
                {row?.wrappedEVMAccount?.readableReceipt?.to}{" "}
              </Link>
            ) : (
              <span>Contract Creation</span>
            )}
          </td>
          <td>
            <span>
              {calculateValue(row?.wrappedEVMAccount?.readableReceipt?.value)}
            </span>
          </td>
          <td>
            <span>{calculateValue(row?.wrappedEVMAccount?.amountSpent)}</span>
          </td>
        </>
      );
    }
    if (txType === TransactionSearchType.Internal) {
      return (
        <>
          <td>
            <Link href={`/account/${row?.tokenFrom}`} className={styles.link}>
              {row?.tokenFrom}
            </Link>
          </td>
          <td>
            <Link href={`/account/${row?.tokenTo}`} className={styles.link}>
              {row?.tokenTo}
            </Link>
          </td>
          <td>
            <span>{calculateTokenValue(row, row.tokenType)}</span>
          </td>
          <td>
            <span>{row?.transactionFee}</span>
          </td>
        </>
      );
    }
    if (txType === TransactionSearchType.ERC_20) {
      return (
        <>
          <td>
            <Link href={`/account/${row?.tokenFrom}`} className={styles.link}>
              {row?.tokenFrom}
            </Link>
          </td>
          <td>
            <Link href={`/account/${row?.tokenTo}`} className={styles.link}>
              {row?.tokenTo}
            </Link>
          </td>
          <td>
            <span>{calculateTokenValue(row, row.tokenType)}</span>
          </td>
          <td>
            <span>{row?.contractInfo?.name || row?.contractAddress}</span>
          </td>
          <td>
            <span>{calculateValue(row?.transactionFee)}</span>
          </td>
        </>
      );
    }
    if (txType === TransactionSearchType.ERC_721) {
      return (
        <>
          <td>
            <Link href={`/account/${row?.tokenFrom}`} className={styles.link}>
              {row?.tokenFrom}
            </Link>
          </td>
          <td>
            <Link href={`/account/${row?.tokenTo}`} className={styles.link}>
              {row?.tokenTo}
            </Link>
          </td>
          <td>
            <span>{calculateTokenValue(row, row.tokenType)}</span>
          </td>
          <td>
            <span>
              {row?.contractInfo?.name || short(row?.contractAddress)}
            </span>
          </td>
          <td>
            <span>{calculateValue(row?.transactionFee)}</span>
          </td>
        </>
      );
    }
    if (txType === TransactionSearchType.ERC_1155) {
      return (
        <>
          <td>
            <Link href={`/account/${row?.tokenFrom}`} className={styles.link}>
              {row?.tokenFrom}
            </Link>
          </td>
          <td>
            <Link href={`/account/${row?.tokenTo}`} className={styles.link}>
              {row?.tokenTo}
            </Link>
          </td>
          <td>
            <span>{calculateTokenValue(row, row.tokenType, true)}</span>
          </td>
          <td>
            <span>{calculateTokenValue(row, row.tokenType)}</span>
          </td>
          <td>
            {row?.contractInfo?.name ? (
              <span>{row?.contractInfo?.name}</span>
            ) : (
              <Link
                href={`/token/${row?.contractAddress}`}
                className={styles.link}
              >
                {short(row?.contractAddress)}
              </Link>
            )}
          </td>
          <td>
            <span>{calculateValue(row?.transactionFee)}</span>
          </td>
        </>
      );
    }

    return (
      <>
        <td>
          <span>
            {calculateValue(row?.wrappedEVMAccount?.readableReceipt?.value)}
          </span>
        </td>
        <td>
          <span>{calculateValue(row?.transactionFee)}</span>
        </td>
      </>
    );
  };

  return (
    <table className={styles.TransactionTable}>
      <thead>
        <tr>
          {header.map((item, index) => (
            <th key={`${item}-${index}`}>{item}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data?.map((row, index) => (
          <tr key={`${index}`}>
            <td>
              <Link href={`/transaction/${row.txHash}`} className={styles.link}>
                {row.txHash}
              </Link>
            </td>
            <td>
              <Chip title={showTxMethod(row)} color="success" />
            </td>
            <td>
              <span>{row.cycle}</span>
            </td>
            <td title={toReadableDateFromMillis(row.timestamp)}>
              <span>{moment(row.timestamp).fromNow()}</span>
            </td>
            {renderColumn(row)}
          </tr>
        ))}
      </tbody>
    </table>
  )
};
