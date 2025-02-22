import React from 'react'

import styles from './Receipt.module.scss'

interface ReceiptProps {
  receipt: unknown
}

export const Receipt: React.FC<ReceiptProps> = ({ receipt }) => {
  return (
    <div className={styles.Receipt}>
      <pre>{JSON.stringify(receipt, null, 4)}</pre>
    </div>
  )
}
