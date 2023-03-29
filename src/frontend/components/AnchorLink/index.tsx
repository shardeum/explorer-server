import Link from 'next/link'
import cx from 'classnames'
import styles from './AnchorLink.module.scss'

interface IAnchorLink {
  href: string
  label: string | number
  size: 'small' | 'medium' | 'large'
  ellipsis?: boolean
  width?: number
}

export const AnchorLink: React.FC<IAnchorLink> = ({ href, label, size = 'medium', ellipsis, width }) => {
  const style = cx(styles.AnchorLink, styles[size as string], ellipsis && styles.ellipsis)

  return (
    <Link href={href} className={style} style={ellipsis ? { maxWidth: width } : {}}>
      {label}
    </Link>
  )
}
