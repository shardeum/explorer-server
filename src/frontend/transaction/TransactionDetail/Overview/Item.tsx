import React from 'react'

import { Icon } from '../../../components'

import styles from './Ovewview.module.scss'
import Link from 'next/link'

interface ItemProps {
  from?: string
  to?: string
  tokenId?: string
  token?: string
  type?: string
  contractAddress?: string
}
export const Item: React.FC<ItemProps> = ({ from, to, tokenId, token, type, contractAddress }) => {
  return (
    <div className={styles.Overivew_Item}>
      <div className={styles.listItem}>
        <div>
          <div className={styles.listItemRow}>
            <div className={styles.listItemCol}>
              <Icon name="right_arrow" color="black" size="small" />
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
              <div>&nbsp;For Token ID&nbsp;</div>
              <Link href={`/token/${contractAddress}`} className={styles.listLink}>
                [{tokenId}]
              </Link>
              &nbsp;of&nbsp;
            </div>
            <div className={styles.listItemCol}>
              <Link href={`/token/${contractAddress}`} className={styles.listLink}>
                &nbsp;{token}
              </Link>
              <span>&nbsp;{type}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
