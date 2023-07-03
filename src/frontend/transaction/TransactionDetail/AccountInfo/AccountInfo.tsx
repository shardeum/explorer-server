import React from 'react'
import { AccountType } from '../../../../types'
import { calculateValue } from '../../../utils/calculateValue'
import { rlp, toBuffer, bufferToHex } from 'ethereumjs-util'

import styles from './AccountInfo.module.scss'
import web3 from "web3";

interface AccountInfoProps {
  receipt: {
    accounts: {
      accountId: string
      data: {
        accountType: AccountType
        contractAddress: string
        ethAddress: string
        account: {
          balance: string
          nonce: string
          key: string
        }
        key?: string
        value: {
          data: Buffer
        }
        codeHash: {
          data: Buffer
        }
        codeByte: {
          data: Buffer
        }
      }
    }[]
  }
}

export const AccountInfo: React.FC<AccountInfoProps> = ({ receipt }) => {
  const accounts = receipt?.accounts
  const accountsInfo = accounts?.map((account) => {
    if (account?.data?.accountType === AccountType.Account)
      return {
        accountId: account?.accountId,
        ethAddress: account?.data?.ethAddress,
        accountType: 'EOA or CA',
        balance: calculateValue(account?.data?.account?.balance) + ' SHM',
        nonce: web3.utils.hexToNumber('0x' + account?.data?.account?.nonce),
      }
    else if (account?.data?.accountType === AccountType.ContractStorage)
      return {
        accountId: account?.accountId,
        ethAddress: account?.data?.ethAddress,
        accountType: 'Contract Storage',
        storageKey: account?.data?.key,
        valueRaw: rlp.decode(toBuffer(bufferToHex(account?.data?.value?.data))).toString('hex'),
        decodedValueDec: web3.utils.hexToNumberString(
          '0x' + rlp.decode(toBuffer(bufferToHex(account?.data?.value?.data))).toString('hex')
        ),
      }
    else if (account?.data?.accountType === AccountType.ContractCode)
      return {
        accountId: account?.accountId,
        ethAddress: account?.data?.ethAddress,
        contractAddress: account?.data?.contractAddress,
        accountType: 'Contract Code',
        codeHash: bufferToHex(account?.data?.codeHash?.data),
        codeByte: bufferToHex(account?.data?.codeByte?.data),
      }
  })
  return (
    <div className={styles.AccountInfo}>
      <pre>{JSON.stringify(accountsInfo, null, 4)}</pre>
    </div>
  )
}
