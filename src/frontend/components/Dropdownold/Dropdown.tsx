import React, { useState } from 'react'
import cx from 'classnames'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Menu } from '../Menu'
import { MenuItem } from '../MenuItem'
import styles from './Dropdown.module.scss'

export interface DropdownProps {
  items: string[]
  onSelect?: (i: unknown) => void
  selected?: string
  disabled?: boolean
  apperance?: 'primary' | 'secondary' | 'outlined' | 'default'
  size?: 'large' | 'medium' | 'small'
  className?: string
  buttonClassName?: string
  onHoverOpen?: boolean
}

export const Dropdown: React.FC<DropdownProps> = ({
  items,
  selected,
  onSelect,
  disabled,
  apperance,
  size,
  className,
  buttonClassName,
  onHoverOpen = false,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const open = (): void => setIsFilterOpen(true)
  const close = (): void => setIsFilterOpen(false)

  const onPress = (d: string): void => {
    onSelect?.(d)
    close()
  }

  return (
    <div className={cx(styles.Dropdown, className)}>
      <Menu
        anchor={
          <Button
            apperance={apperance}
            size={size}
            onClick={open}
            disabled={disabled}
            className={buttonClassName}
            data-active={isFilterOpen}
            onMouseEnter={() => {
              onHoverOpen && open()
            }}
          >
            {selected || items[0]}
            {isFilterOpen ? (
              <Icon name="arrow_up" color="black" className={styles.icon} />
            ) : (
              <Icon name="arrow_down" color="black" className={styles.icon} />
            )}
          </Button>
        }
        horizontalPosition="left"
        isMenuOpen={isFilterOpen}
        onClose={close}
        onOpen={open}
        onMouseDown={(e) => {
          e.preventDefault()
          open()
        }}
        top={8}
      >
        {items.map((item, index) => (
          <MenuItem
            label={item}
            key={`${item}-${index}`}
            onClick={(e) => {
              e.stopPropagation()
              onPress(item)
            }}
            isActive={item === selected}
          />
        ))}
      </Menu>
    </div>
  )
}
