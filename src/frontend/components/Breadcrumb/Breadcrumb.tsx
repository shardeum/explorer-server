import React, { Fragment } from 'react'
import Link from 'next/link'
import cx from 'classnames'

import styles from './Breadcrumb.module.scss'
import { useRouter } from 'next/router'

interface item {
  to: string | number
  label: string | number
}

interface BreadcrumbProps {
  items: item[] | []
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const router = useRouter()

  const lastIndex = items?.length - 1

  return (
    <ol className={styles.Breadcrumb}>
      {items?.map((item: item, index: number) => {
        return (
          <Fragment key={`${index}-${item.to}`}>
            <li className={cx(styles.item, router?.pathname === item.to && styles.active)}>
              <Link href={item.to.toString()} className={styles.link}>
                {item.label}
              </Link>
            </li>
            {index < lastIndex && <li className={cx(styles.item, styles.inactive)}>/</li>}
          </Fragment>
        )
      })}
    </ol>
  )
}
