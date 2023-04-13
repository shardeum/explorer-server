import { MouseEventHandler } from 'react'
import cx from 'classnames'

import styles from './MenuItem.module.scss'
import { Icon } from '../Icon'

interface MenuItemProps {
  label: string
  label2?: string
  isActive?: boolean
  type?: 'checkbox' | 'default'
  onClick?: MouseEventHandler<HTMLDivElement>
  className?: string
}

// TODO: maybe we might have to change label as an array; so that we can show many fields inside MenuItem

export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  label2,
  isActive,
  type = 'default',
  onClick,
  className,
}) => {
  const content = (): JSX.Element => {
    if (type === 'checkbox') {
      return (
        <>
          {isActive ? <Icon name="checkbox_checked" /> : <Icon name="checkbox_checked" />}
          <div className={styles.label}>{label}</div>
        </>
      )
    }

    return (
      <>
        <div className={styles.label}>{label}</div>
        <div className={styles.label}>{label2}</div>
      </>
    )
  }

  return (
    <div
      className={cx(styles.MenuItem, isActive && styles.active, className)}
      tabIndex={0}
      role="button"
      onClick={onClick}
    >
      {content()}
    </div>
  )
}
