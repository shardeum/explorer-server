import React, { MouseEvent } from 'react'
import { useCallback, useRef, useState } from 'react'
import styles from './TokenDropdown.module.scss'
import { Button, Icon, Menu, MenuItem, SortButton } from '../../components'
import ReactTooltip from 'react-tooltip'
import { Token } from '../../../types'

interface TokenDropdownProps {
  tokens: Token[]
}

export const TokenDropdown: React.FC<TokenDropdownProps> = (props) => {
  const { tokens } = props
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false)
  const [isSortUp, setIsSortUp] = useState<boolean>(true)

  const inputRef = useRef<HTMLInputElement>(null)

  const open = useCallback(() => {
    setIsFilterOpen(true)
    inputRef?.current?.focus()
  }, [])

  const close = useCallback(() => setIsFilterOpen(false), [])

  return (
    <div className={styles.TokenDropdown}>
      <Menu
        anchor={
          <Button
            apperance="outlined"
            size="medium"
            onClick={open}
            className={styles.button}
            data-active={isFilterOpen}
          >
            <span>{tokens.length}&nbsp;Tokens</span>
            {isFilterOpen ? (
              <Icon name="arrow_up" color="black" className={styles.icon} />
            ) : (
              <Icon name="arrow_down" color="black" className={styles.icon} />
            )}
          </Button>
        }
        isMenuOpen={isFilterOpen}
        onClose={close}
        onOpen={open}
        onMouseDown={(e: MouseEvent) => {
          e.preventDefault()
          open()
        }}
      >
        <input placeholder="Search for Token Name" className={styles.search} ref={inputRef} />
        <div className={styles.item}>
          <div className={styles.label}>
            ERC-20 Tokens <span>(1)</span>
          </div>
          <SortButton isUp={isSortUp} onSort={() => setIsSortUp(!isSortUp)} />
        </div>
        {
          tokens && tokens.length > 0 ? (
            tokens?.map((row, index) => (
              <MenuItem
                key={index}
                label={row.balance}
                label2={row?.contractInfo.name}
                className={styles.menuItem}
              />
            ))
          ) : (
            <div className={styles.empty}>No Tokens Found!</div>
          ) // TODO: add some margin/padding style
        }
      </Menu>
      <Button
        apperance="outlined"
        className={styles.walletButton}
        size="medium"
        data-tip="View token holdings in more detail"
        data-for="tdd"
      >
        <Icon name="wallet" color="black" />
      </Button>
      <ReactTooltip effect="solid" backgroundColor="#6610f2" id="tdd" />
    </div>
  )
}
