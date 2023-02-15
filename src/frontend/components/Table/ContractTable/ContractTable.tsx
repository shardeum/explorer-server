import styles from "./ContractTable.module.scss";
import Link from "next/link";
import { Account } from "../../../types";
import moment from "moment";

interface ContractTableProps {
  contracts: Account[];
  loading: boolean;
}

const header = ["Contract Address", "Last Used"];

export const ContractTable: React.FC<ContractTableProps> = ({
  contracts,
  loading,
}) => {
  if (contracts.length < 1) {
    return <div>No Data</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <table className={styles.ContractTable}>
      <thead>
        <tr>
          {header.map((field, index) => (
            <th key={`${field}-${index}`}>{field}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {contracts.map((row, index) => (
          <tr key={`${index}`}>
            <td>
              <Link
                href={`/account/${row?.ethAddress}`}
                className={styles.link}
              >
                {row?.ethAddress}
              </Link>
            </td>
            <td>
              <span>{moment(row?.timestamp).fromNow()}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
