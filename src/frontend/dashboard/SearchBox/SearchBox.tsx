import React from 'react'

import { Icon } from '../../components'

import { useSearchHook } from './useSearchHook'

import styles from './SearchBox.module.scss'

interface SearchBoxProps {}

export const SearchBox: React.FC<SearchBoxProps> = ({}) => {
  const { search, setSearch, onSearch } = useSearchHook()

  return (
    <div className={styles.SearchBox}>
      <h4 className={styles.title}>The Shardeum Betanet Explorer</h4>
      <div className={styles.box}>
        <input
          className={styles.input}
          placeholder="Search by Account Address / Contract Address / Transaction Hash / Cycle Number / Cycle Marker / Node ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key == 'Enter') {
              onSearch()
            }
          }}
        />
        <div className={styles.iconWrapper} onClick={onSearch}>
          <Icon name="search" size="medium" color="white" />
        </div>
      </div>
    </div>
  )
}
