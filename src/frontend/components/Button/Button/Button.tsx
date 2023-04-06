import React, { MouseEventHandler, ReactNode } from 'react'
import cx from 'classnames'

import styles from './Button.module.scss'

interface ButtonProps {
  className?: string
  onClick?: MouseEventHandler
  onMouseEnter?: MouseEventHandler
  disabled?: boolean
  children: ReactNode
  apperance?: 'primary' | 'secondary' | 'outlined' | 'default'
  size?: 'large' | 'medium' | 'small'
  type?: 'button' | 'link'
}

export const Button: React.FC<ButtonProps> = ({
  className,
  onClick,
  disabled,
  children,
  apperance = 'default',
  size = 'medium',
  type = 'button',
  ...props
}) => {
  const style = cx(styles.Button, styles[apperance as string], styles[size as string], className)

  return (
    <button onClick={onClick} {...props} disabled={disabled} className={style}>
      {children}
    </button>
  )
}
