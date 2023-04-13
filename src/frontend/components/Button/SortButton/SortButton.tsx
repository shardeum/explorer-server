import React, { MouseEventHandler, useState } from 'react'
import ReactTooltip from 'react-tooltip'

import { Icon } from '../../Icon'

import styles from './SortButton.module.scss'

interface SortButtonProps {
  isUp?: boolean
  className?: string
  onSort?: MouseEventHandler
}

export const SortButton: React.FC<SortButtonProps> = ({ isUp, className, onSort }) => {
  const [up, setUp] = useState<boolean>(isUp || false)

  const onClick = (e: any): void => {
    setUp(!up)
    onSort?.(e)
  }

  return (
    <>
      <button onClick={onClick} className={styles.SortButton} data-tip="Click to sort" data-for="sb">
        <Icon name="triangle_up" color={isUp ? 'black' : 'disabled'} size="tiny" className={styles.iconUp} />
        <Icon
          name="triangle_down"
          color={isUp ? 'disabled' : 'black'}
          size="tiny"
          className={styles.iconDown}
        />
      </button>
      <ReactTooltip effect="solid" backgroundColor="#6610f2" id="sb" />
    </>
  )
}
