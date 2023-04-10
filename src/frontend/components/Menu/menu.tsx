import React, { MouseEventHandler, useCallback, useEffect, useRef } from 'react'
import cx from 'classnames'

import styles from './Menu.module.scss'

interface MenuProps {
  onOpen?: () => void
  onClose?: () => void
  anchor: React.ReactNode
  isMenuOpen: boolean
  className?: string
  onMouseDown?: MouseEventHandler
  children: React.ReactNode

  verticalPosition?: string
  horizontalPosition?: string
  top?: number
  left?: number
}

export const Menu: React.FC<MenuProps> = (props) => {
  const { onOpen, onClose, anchor, isMenuOpen, className, onMouseDown, children } = props

  const menuRef = useRef<any | null>(null)

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      onClose?.()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick, true)

    return () => {
      document.removeEventListener('click', handleOutsideClick, true)
    }
  }, [handleOutsideClick])

  return (
    <div>
      {anchor}
      {isMenuOpen && (
        <div
          onClick={onOpen}
          onFocus={onOpen}
          onBlur={onClose}
          tabIndex={0}
          className={cx(styles.Menu, className)}
          data-active={isMenuOpen}
          role="button"
          onMouseDown={onMouseDown}
          ref={menuRef}
        >
          {children}
        </div>
      )}
    </div>
  )
}
