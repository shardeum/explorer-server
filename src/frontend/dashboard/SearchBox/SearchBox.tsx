import React from 'react'

import { Icon } from '../../components'

import { useSearchHook } from '../../components/SearchBar/useSearchHook'

import styles from './SearchBox.module.scss'
import NetworkMode from '../NetworkMode/NetworkMode'
import { Modes } from '../../types/modes'

interface SearchBoxProps {
  mode: string | undefined
}

export const SearchBox: React.FC<SearchBoxProps> = ({ mode }) => {
  const { search, setSearch, onSearch } = useSearchHook()

  return (
    <div className={styles.SearchBox}>
      <div className={styles.titleWrapper}>
        <h4 className={styles.title}>The Shardeum Betanet Explorer</h4>
        <NetworkMode mode={mode as Modes} />
      </div>
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
