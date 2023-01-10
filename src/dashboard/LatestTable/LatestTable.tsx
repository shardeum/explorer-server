import { useRouter } from "next/router";
import React from "react";
import { Button, Spacer } from "../../components";

import styles from "./LatestTable.module.scss";

type item = {
  key: string | number;
  value: string;
};

export interface LatestTableProps {
  title: string;
  name: string;
  data: item[] | [];
  type: "cycle" | "transaction";
  loading: boolean;
}

export const LatestTable: React.FC<LatestTableProps> = ({
  title,
  name,
  data,
  type,
  loading,
}) => {
  const router = useRouter();

  return (
    <div className={styles.LatestTable}>
      <div className={styles.title}>{title}</div>
      <hr />
      {data.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className={styles.item}
          onClick={() => {
            router.push(
              type === "cycle"
                ? `/cycle/${item.key}`
                : `/transaction/${item.value}`
            );
          }}
        >
          <div className={styles.count}>{item.key}</div>
          <div className={styles.date}>{item.value}</div>
        </div>
      ))}
      <Spacer space="16" />
      <Button
        className={styles.button}
        apperance="primary"
        onClick={() => {
          router.push(type === "cycle" ? "/cycle" : "/transaction");
        }}
      >
        {name}
      </Button>
    </div>
  );
};
