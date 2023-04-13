import React, { useState } from 'react'
import ReactTooltip from 'react-tooltip'

import { Icon } from '../../Icon'

import styles from './CopyButton.module.scss'

interface CopyButtonProps {
  title?: string
  text: string
  className?: string
}

export const CopyButton: React.FC<CopyButtonProps> = ({ title, text, className }) => {
  const [isCopied, setIsCopied] = useState<boolean>(false)

  const onCopy = (): void => {
    setIsCopied(true)

    setTimeout(() => {
      setIsCopied(false)
    }, 700)

    navigator.clipboard.writeText(text)
  }

  const t = isCopied ? 'Copied' : title ? title : 'Click to copy'

  return (
    <>
      <button data-tip={t} data-for="cb" onClick={onCopy} className={styles.CopyButton}>
        <Icon name={isCopied ? 'check' : 'copy'} color="black" />
        <ReactTooltip effect="solid" backgroundColor="#3498db" id="cb" />
      </button>
    </>
  )
}
