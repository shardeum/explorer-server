import React from "react";

import { Icon } from "../../../components";

import styles from "./Ovewview.module.scss";
import Link from "next/link";

interface ItemProps {
  from?: string;
  to?: string;
  tokenId?: string;
  token?: string;
  type?: string;
}
export const Item: React.FC<ItemProps> = ({
  from,
  to,
  tokenId,
  token,
  type,
}) => {
  return (
    <div className={styles.Overivew_Item}>
      <div className={styles.listItem}>
        <Icon name="right_arrow" color="black" size="small" />
        <div>
          <div className={styles.listItemRow}>
            <div className={styles.listItemCol}>
              <div className={styles.listTitle}>From</div>
              <Link href={`/account/${from}`} className={styles.listLink}>
                {from}
              </Link>
            </div>
            <div className={styles.listItemCol}>
              <div className={styles.listTitle}>To</div>
              <Link href={`/account/${to}`} className={styles.listLink}>
                {to}
              </Link>
            </div>
          </div>
          <div className={styles.listItemRow}>
            <div className={styles.listItemCol}>
              <div>
                <span>For&nbsp;</span>
                {type}
                Token ID&nbsp;
              </div>
              <Link href={`/token/${tokenId}`} className={styles.listLink}>
                [{tokenId}]
              </Link>
            </div>
            <div className={styles.listItemCol}>
              <Link href={`/account/${token}`} className={styles.listLink}>
                {token}
              </Link>
              <span>&nbsp;{type}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
