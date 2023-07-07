import React from 'react'

import { Icon } from '../../../components'

import styles from './Ovewview.module.scss'
import Link from 'next/link'

interface ItemProps {
  from: string
  to: string
  tokenId: string
  tokenValue?: string
  token: string
  type: string
  contractAddress: string
}
export const Item: React.FC<ItemProps> = ({
  from,
  to,
  tokenId,
  tokenValue,
  token,
  type,
  contractAddress,
}) => {
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
              <div>
                &nbsp;{type}
                <span>For</span>
              </div>
              {tokenValue && (
                <div>
                  {tokenValue} <span>of</span>
                </div>
              )}
              <div>Token ID&nbsp;</div>
              <Link href={`/token/${contractAddress}`} className={styles.listLink}>
                [{tokenId}]
              </Link>
            </div>
            <div className={styles.listItemCol}>
              <Link href={`/token/${contractAddress}`} className={styles.listLink}>
                &nbsp;{token}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
