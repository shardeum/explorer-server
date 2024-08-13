import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLayoutBreakpoint } from '../../utils/useLayoutBreakpoint'
import { SearchBar } from '../SearchBar'

import { Icon, Menu, MenuItem, Button, TopBarDropdown } from '../index'

import styles from './Header.module.scss'

export const Header: React.FC<Record<string, never>> = () => {
  const router = useRouter()

  const isHomePage = router.pathname === '/'

  const { isTablet, isMobile } = useLayoutBreakpoint()

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)

  const open = (): void => setIsMenuOpen(true)
  const close = (): void => setIsMenuOpen(false)

  const navLinks = [
    { key: '/', value: 'Home' },
    {
      key: 'betanet',
      value: 'About Betanet',
      render: () => {
        return (
          <TopBarDropdown
            label=""
            options={[
              { key: 'https://shardeum.org/betanet', value: 'Shardeum Betanet' },
              { key: 'https://docs.shardeum.org/docs/node/run/validator', value: 'Run a validator node' },
            ]}
          />
        )
      },
    },
  ]

  const renderMenuButton = (): JSX.Element => {
    if (isTablet || isMobile) {
      return (
        <Menu
          anchor={
            <Button onMouseEnter={open} onClick={open} apperance="outlined" size="medium">
              <Icon name="menu" size="medium" color="black" />
            </Button>
          }
          isMenuOpen={isMenuOpen}
          onClose={close}
          onOpen={open}
          horizontalPosition="right"
          verticalPosition="bottom"
          top={4}
          left={-30}
          onMouseDown={(e) => e.preventDefault()}
        >
          {navLinks.map((item) => (
            <MenuItem
              key={item.key}
              label={item.value}
              isActive={item.key === router.pathname}
              onClick={(e) => {
                e.stopPropagation()
                close()
              }}
            />
          ))}
        </Menu>
      )
    }
    return <> </>
  }

  return (
    <header className={styles.Header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logoWrapper}>
          <Icon name="logo" className={styles.logo} size="extraLarge" />
          <div className={styles.name}>Shardeum Explorer</div>
        </Link>
        <ul className={styles.list}>
          {!isHomePage && <SearchBar />}
          {navLinks.map((item) => (
            <li key={item.key} className={styles.list_item}>
              {item?.render ? item?.render() : <Link href={item.key}>{item.value}</Link>}
            </li>
          ))}
        </ul>
        {renderMenuButton()}
      </nav>
    </header>
  )
}
