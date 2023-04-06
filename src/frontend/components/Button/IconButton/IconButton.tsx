import { MouseEventHandler } from 'react'
import cx from 'classnames'

import styles from './IconButton.module.scss'
import { Icon, iconTypes } from '../../Icon'

interface IconButtonProps {
  className?: string
  title?: string
  onClick?: MouseEventHandler
  disabled?: boolean
  iconName: keyof typeof iconTypes
  iconSize?: 'small' | 'medium' | 'large' | 'extraLarge'
  type?: 'round' | 'rect' | undefined
}

export const IconButton: React.FC<IconButtonProps> = ({
  className,
  title,
  onClick,
  disabled,
  iconName,
  iconSize,
  type,
  ...props
}) => {
  const style = cx(styles.IconButton, styles[type as string], styles[disabled ? 'disabled' : ''], className)

  return (
    <button onClick={onClick} {...props} disabled={disabled} className={style}>
      {title && title}
      <Icon name={iconName} size={iconSize} color={disabled ? 'disabled' : 'white'} />
    </button>
  )
}
