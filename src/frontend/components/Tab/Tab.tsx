import React, { Key, ReactNode } from 'react'
import cx from 'classnames'

import styles from './Tab.module.scss'

interface TabProps<K extends Key> {
  tabs: Tab<K>[]
  activeTab?: unknown
  onClick: (key: K) => void
  className?: string
}

interface Tab<K extends Key> {
  key: K
  value: string
  content: ReactNode
}

export const Tab = <K extends Key>(props: TabProps<K>): JSX.Element => {
  const { tabs, activeTab, onClick, className } = props

  const renderHeaders = (): JSX.Element[] => {
    return tabs.map((tab, index) => (
      <button
        key={index}
        className={cx(styles.tab, tab.key === activeTab && styles.active)}
        onClick={() => onClick(tab.key)}
      >
        {tab.value}
      </button>
    ))
  }

  const renderContent = (): (JSX.Element | '')[] => {
    return tabs.map((tab) => (tab.key === activeTab ? <div key={tab.key}>{tab.content}</div> : ''))
  }

  return (
    <div className={cx(styles.Tab, className)}>
      <header className={styles.header}>{renderHeaders()}</header>
      <div className={styles.content}>{renderContent()}</div>
    </div>
  )
}
