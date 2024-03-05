import React from 'react'
import cx from 'classnames'

import styles from './Icon.module.scss'

import Logo from './svgs/logo.svg'
import Search from './svgs/search.svg'
import Account from './svgs/account.svg'
import Contract from './svgs/contract.svg'
import Cycle from './svgs/cycle.svg'
import Node from './svgs/nodes.svg'
import Standby from './svgs/blocks-group-outline-badged-svgrepo-com.svg'
import Reward from './svgs/reward.svg'
import Transaction from './svgs/transaction.svg'
import ArrowLeft from './svgs/arrow_left.svg'
import ArrowRight from './svgs/arrow_right.svg'
import ArrowDown from './svgs/arrow_down.svg'
import ArrowUp from './svgs/arrow_up.svg'
import UpArrow from './svgs/up_arrow.svg'
import CheckboxChecked from './svgs/checkbox-checked.svg'
import CheckboxUnchecked from './svgs/checkbox-unchecked.svg'
import Menu from './svgs/menu.svg'
import Copy from './svgs/copy.svg'
import Check from './svgs/check.svg'
import TriangleUp from './svgs/triangle-up.svg'
import TriangleDown from './svgs/triangle-down.svg'
import Wallet from './svgs/wallet.svg'
import Twitter from './svgs/twitter.svg'
import Facebook from './svgs/facebook.svg'
import Medium from './svgs/medium.svg'
import Reddit from './svgs/reddit.svg'
import Log from './svgs/log.svg'
import RightArrow from './svgs/right_arrow.svg'
import Nft from './svgs/nft.svg'
import Discord from './svgs/discord.svg'
import Telegram from './svgs/telegram.svg'

export const iconTypes = {
  logo: Logo,
  search: Search,
  account: Account,
  contract: Contract,
  cycle: Cycle,
  node: Node,
  standby: Standby,
  reward: Reward,
  transaction: Transaction,
  arrow_left: ArrowLeft,
  arrow_right: ArrowRight,
  arrow_up: ArrowUp,
  up_arrow: UpArrow,
  arrow_down: ArrowDown,
  checkbox_checked: CheckboxChecked,
  checkbox_unchecked: CheckboxUnchecked,
  menu: Menu,
  copy: Copy,
  check: Check,
  triangle_up: TriangleUp,
  triangle_down: TriangleDown,
  wallet: Wallet,
  twitter: Twitter,
  facebook: Facebook,
  medium: Medium,
  reddit: Reddit,
  discord: Discord,
  telegram: Telegram,
  log: Log,
  right_arrow: RightArrow,
  nft: Nft,
}

export interface IconProps {
  name: keyof typeof iconTypes
  className?: string
  color?: 'primary' | 'black' | 'white' | 'disabled' | undefined
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'extraLarge'
}

export const Icon: React.FC<IconProps> = ({ name, className, color = 'white', size = 'small', ...props }) => {
  // eslint-disable-next-line security/detect-object-injection
  const IconComponent = iconTypes[name]

  const style = cx(styles.Icon, `${styles[color as string]}`, `${styles[size as string]}`, className)

  return <IconComponent {...props} className={style} />
}
