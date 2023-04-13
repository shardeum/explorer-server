import cx from 'classnames'
import ReactTooltip from 'react-tooltip'
import { Button, IconButton } from '../Button'
import { Icon } from '../Icon'

import styles from './Pagination.module.scss'
import { usePagination, DOTS } from './usePagination'

export interface PaginationProps {
  onPageChange: (page: number) => void
  totalCount: number
  siblingCount?: number
  currentPage: number
  pageSize: number
  className?: string
}

export const Pagination: React.FC<PaginationProps> = (props) => {
  const { onPageChange, totalCount, siblingCount = 1, currentPage, pageSize, className } = props

  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize,
  })

  if (currentPage === 0 || paginationRange.length < 2) {
    return null
  }

  const onNext = (): void => {
    onPageChange(currentPage + 1)
  }

  const onPrevious = (): void => {
    onPageChange(currentPage - 1)
  }

  const onChnagePage = (page: number | string): void => {
    if (typeof page === 'string') onPageChange(parseInt(page, 2))
    else onPageChange(page)
  }

  const lastPage = paginationRange[paginationRange.length - 1]

  return (
    <div className={cx(styles.Pagination, className)}>
      <Button
        apperance="outlined"
        disabled={currentPage === 1}
        onClick={onPrevious}
        className={styles.button}
        data-tip={'Go To Prev'}
        data-for="prev"
      >
        <Icon name="arrow_left" color={currentPage === 1 ? 'disabled' : 'black'} />
      </Button>
      {paginationRange.map((pageNumber) => {
        if (pageNumber === DOTS) {
          return (
            <div className={styles.label} key={pageNumber}>
              &#8230;
            </div>
          )
        }
        return (
          <button
            key={pageNumber}
            type="button"
            className={cx(styles.label, currentPage === pageNumber && styles.active)}
            onClick={() => onChnagePage(pageNumber)}
          >
            {pageNumber}
            <div className={cx(currentPage === pageNumber && styles.underline)} />
          </button>
        )
      })}
      <Button
        apperance="outlined"
        disabled={currentPage === lastPage}
        onClick={onNext}
        className={styles.button}
        data-tip={'Go To Next'}
        data-for="next"
      >
        <Icon name="arrow_right" color={currentPage === lastPage ? 'disabled' : 'black'} />
      </Button>
      <ReactTooltip effect="solid" backgroundColor="#6610f2" id="prev" />
      <ReactTooltip effect="solid" backgroundColor="#6610f2" id="next" />
    </div>
  )
}
