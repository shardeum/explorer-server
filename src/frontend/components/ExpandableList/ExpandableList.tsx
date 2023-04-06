import React, { useCallback, useState } from 'react'
import { Icon } from '../Icon'
import styles from './ExpandableList.module.scss'

type Option = {
  key: string | number
  value: any
}

interface IExpandableList {
  label: string
  options: Option[]
  onSelect: (item: Option) => void
}

export const ExpandableList: React.FC<IExpandableList> = ({ label, options }) => {
  const [isExpand, setIsExpand] = useState<boolean>(false)

  const open = useCallback(() => setIsExpand(true), [])

  const close = useCallback(() => setIsExpand(false), [])

  const toggleExpand = useCallback(() => {
    if (isExpand) close()
    else open()
  }, [close, isExpand, open])

  return (
    <div className={styles.ExpandableList}>
      <button className={styles.button} onClick={toggleExpand} data-active={isExpand}>
        <p>{label}</p>
        {isExpand ? (
          <Icon name="arrow_up" color="black" className={styles.icon} />
        ) : (
          <Icon name="arrow_down" color="black" className={styles.icon} />
        )}
      </button>
      {isExpand && (
        <ul className={styles.list}>
          {options.map((item) => (
            <li key={item.key}>{item.value}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
