import styles from "./CycleTable.module.scss";
import Link from "next/link";
import { Cycle } from "../../../types";
import moment from "moment";
import { Table } from "../../TableComp";

interface CycleTableProps {
  cycles: Cycle[];
  loading: boolean;
}

const header = ["Count", "Timestamp"];

export const CycleTable: React.FC<CycleTableProps> = ({ cycles, loading }) => {
  if (cycles.length < 1) {
    return <div>No Data</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  // return (
  //   <Table
  //     headers={[
  //       { name: "Name", value: "name" },
  //       { name: "Email", value: "email" },
  //       { name: "Password", value: "password" },
  //     ]}
  //     // rows = []
  //   />
  // );

  return (
    <table className={styles.CycleTable}>
      <thead>
        <tr>
          {header.map((field, index) => (
            <th key={`${field}-${index}`}>{field}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cycles.map((row, index) => (
          <tr key={`${index}`}>
            <td>
              <Link href={`/cycle/${row.counter}`} className={styles.link}>
                {row?.cycleRecord?.counter}
              </Link>
            </td>
            <td>
              <span>{moment(row?.cycleRecord?.start * 1000).calendar()}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
