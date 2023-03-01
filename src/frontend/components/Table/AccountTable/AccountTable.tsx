import Link from "next/link";
import moment from "moment";
import Web3Utils from "web3-utils";

import { Account } from "../../../types";

import styles from "./AccountTable.module.scss";
import { toReadableDateFromMillis } from "../../../../utils/time";

interface AccountTableProps {
  accounts: Account[];
  loading: boolean;
}

const header = ["Account Address", "Balance", "Last Used", "Account Type"];

export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  loading,
}) => {
  if (accounts.length < 1) {
    return <div>No Data</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <table className={styles.AccountTable}>
      <thead>
        <tr>
          {header.map((field, index) => (
            <th key={`${field}-${index}`}>{field}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {accounts.map((row, index) => (
          <tr key={`${index}`}>
            <td>
              <Link href={`/account/${row?.ethAddress}`} className={styles.link}>
                {row?.ethAddress}
              </Link>
            </td>
            <td>
              <span>{Number(Web3Utils.fromWei(row?.account?.balance, 'ether')).toFixed()} SHM</span>
            </td>
            <td title={toReadableDateFromMillis(row?.timestamp)}>
              <span>{moment(row?.timestamp).fromNow()}</span>
            </td>
            <td>
              <span>{row?.contractInfo ? 'Contract Account' : 'User Account'}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
};
