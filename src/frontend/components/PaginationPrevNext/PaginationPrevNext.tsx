import React, { MouseEventHandler } from 'react'
import cx from 'classnames'

import { Button } from '../Button'
import { Icon } from '../Icon'

import styles from './PaginationPrevNext.module.scss'
import ReactTooltip from 'react-tooltip'

export interface PaginationPrevNextProps {
  page: number | string
  onPrev: MouseEventHandler
  onNext: MouseEventHandler
  className?: string
}

export const PaginationPrevNext: React.FC<PaginationPrevNextProps> = (props) => {
  const { page, onPrev, onNext, className } = props

  return (
    <div className={cx(styles.PaginationPrevNext, className)}>
      <Button
        onClick={onPrev}
        apperance="default"
        size="medium"
        className={cx(styles.button, styles.rightborder)}
        data-tip={'Go To Prev'}
        data-for="prev"
      >
        <Icon name="arrow_left" size="small" color="black" />
      </Button>
      <div className={styles.label}>{page}</div>
      <Button
        onClick={onNext}
        apperance="default"
        size="medium"
        className={cx(styles.button, styles.leftborder)}
        data-tip={'Go To Next'}
        data-for="nex"
      >
        <Icon name="arrow_right" size="small" color="black" />
      </Button>
      <ReactTooltip effect="solid" backgroundColor="#6610f2" id="prev" />
      <ReactTooltip effect="solid" backgroundColor="#6610f2" id="nex" />
    </div>
  )
}
