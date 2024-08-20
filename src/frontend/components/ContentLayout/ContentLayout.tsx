import React, { ReactNode } from 'react'
import { useRouter } from 'next/router'
import cx from 'classnames'

import { Button } from '../Button'
import { Icon } from '../Icon'

import styles from './ContentLayout.module.scss'
import { Breadcrumb } from '../Breadcrumb'
import ClientOnlyTooltip from '../ClientOnlyTooltip'

interface ContentLayoutProps {
  className?: string
  title: string | ReactNode
  titleRight?: ReactNode
  showBackButton?: boolean
  breadcrumbItems?: { to: string; label: string }[]
  children: ReactNode
}

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  className,
  title,
  titleRight,
  showBackButton,
  breadcrumbItems,
  children,
}) => {
  const router = useRouter()

  const goBack = (): void => router.back()

  return (
    <div className={cx(styles.ContentLayout, className)}>
      <div className={styles.header}>
        {showBackButton && (
          <Button
            apperance="outlined"
            size="medium"
            onClick={goBack}
            className={styles.button}
            data-tip={'Go Back'}
            data-for="back"
          >
            <Icon name="arrow_left" size="medium" color="black" />
          </Button>
        )}
        {breadcrumbItems && breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems || []} />}
        <ClientOnlyTooltip effect="solid" backgroundColor="#6610f2" id="back" />
      </div>
      <div className={styles.titleWrapper}>
        {typeof title === 'string' ? <div className={styles.title}>{title}</div> : title}
        {titleRight && titleRight}
      </div>
      {children}
    </div>
  )
}
