import React from 'react'
import Link from 'next/link'
import moment from 'moment'
import Web3Utils from 'web3-utils'

import { Chip, Icon } from '../../../components'
import { Item } from './Item'

import { Transaction, TransactionType } from '../../../types'
import { showTxMethod } from '../../../utils/showMethod'

import styles from './Ovewview.module.scss'

import { calculateFullValue, calculateTokenValue } from '../../../utils/calculateValue'
import { toReadableDateFromMillis } from '../../../../utils/time'

interface OvewviewProps {
  transaction: Transaction
}

export const Ovewview: React.FC<OvewviewProps> = ({transaction}) => {
  const renderErc20Tokens = (): JSX.Element | undefined => {
    const items = transaction?.tokenTxs

    // TODO: have to fix TransactionType enum
    if (
      items &&
      items.length > 0 &&
      (items[0].tokenType === TransactionType.EVM_Internal || items[0].tokenType === TransactionType.ERC_20)
    ) {
      return (
        <div className={styles.item}>
          <div className={styles.title}>ERC-20 Tokens Transferred :</div>
          <div className={styles.value}>
            <div className={styles.card}>
              {items.map((item, index) => (
                <div key={index} className={styles.row}>
                  <Icon name="right_arrow" color="black" size="small"/>
                  <span>From</span>
                  <Link href={`/account/${item.tokenFrom}`} className={styles.anchor}>
                    {item.tokenFrom}
                  </Link>
                  <span>To</span>
                  <Link href={`/account/${item.tokenTo}`} className={styles.anchor}>
                    {item.tokenTo}
                  </Link>
                  <span>For</span>
                  {/* TODO: calculate amount and token*/}
                  <div>{calculateTokenValue(item, item.tokenType, null, true)}&nbsp;</div>
                  <Link href={`/account/${item.contractAddress}`} className={styles.anchor}>
                    {item.tokenType === TransactionType.EVM_Internal
                      ? 'SHM'
                      : item.contractInfo.name || item.contractAddress}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }
  }

  const renderErc721Tokens = (): JSX.Element | undefined => {
    const items = transaction?.tokenTxs

    // TODO: have to fix TransactionType enum
    if (items && items.length > 0 && items[0].tokenType === TransactionType.ERC_721) {
      return (
        <div className={styles.item}>
          <div className={styles.title}>ERC-721 Tokens Transferred :</div>
          <div className={styles.value}>
            <Item
              from={items[0]?.tokenFrom}
              to={items[0]?.tokenTo}
              tokenId={calculateTokenValue(items[0], items[0].tokenType)}
              token={items[0]?.contractInfo?.name || items[0]?.contractAddress}
              type="ERC-721"
            />
          </div>
        </div>
      )
    }
  }

  const renderErc1155Tokens = (): JSX.Element | undefined => {
    const items = transaction?.tokenTxs

    // TODO: have to fix TransactionType enum
    if (items && items.length > 0 && items[0].tokenType === TransactionType.ERC_1155) {
      return (
        <div className={styles.item}>
          <div className={styles.title}>ERC-1155 Tokens Transferred :</div>
          <div className={styles.value}>
            <div className={styles.value}>
              <Item
                from={items[0]?.tokenFrom}
                to={items[0]?.tokenTo}
                tokenId={calculateTokenValue(items[0], items[0].tokenType)}
                token={items[0]?.contractAddress}
                type="ERC-1155"
              />
            </div>
          </div>
        </div>
      )
    }
  }

  if (transaction) {
    if (transaction?.txStatus) {
      return (
        <div className={styles.Ovewview}>
          <div className={styles.item}>
            <div className={styles.title}>Transaction Hash:</div>
            <div className={styles.value}>{transaction?.txStatus?.txHash}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.title}>Injected to the network:</div>
            <div className={styles.value}>{transaction?.txStatus?.injected ? 'True' : 'False'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.title}>Accepted by the network:</div>
            <div className={styles.value}>{transaction?.txStatus?.accepted ? 'True' : 'False'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.title}>Reason:</div>
            <div className={styles.value}>{transaction?.txStatus?.reason}</div>
          </div>
        </div>
      )
    } else {
      return (
        <div className={styles.Ovewview}>
          <div className={styles.item}>
            <div className={styles.title}>Transaction Hash:</div>
            <div className={styles.value}>{transaction?.txHash}</div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>Status:</div>
            <div className={styles.value}>
              <Chip
                title={transaction?.wrappedEVMAccount?.readableReceipt?.status === 1 ? 'success' : 'failed'}
                color={transaction?.wrappedEVMAccount?.readableReceipt?.status === 1 ? 'success' : 'error'}
                className={styles.chip}
              />
            </div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>Type:</div>
            <div className={styles.value}>
              <Chip title={showTxMethod(transaction)} color="info" className={styles.chip}/>
            </div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>Cycle:</div>
            <div className={styles.value}>{transaction?.cycle}</div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>Timestamp:</div>
            <div className={styles.value}>
              {moment(transaction?.timestamp).fromNow()} ({toReadableDateFromMillis(transaction?.timestamp)})
            </div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>Nonce:</div>
            <div className={styles.value}>
              {transaction?.wrappedEVMAccount?.readableReceipt?.nonce &&
                Web3Utils.hexToNumber('0x' + transaction?.wrappedEVMAccount?.readableReceipt?.nonce)}
            </div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>From:</div>
            <div className={styles.value}>
              <Link href={`/account/${transaction?.txFrom}`} className={styles.link}>
                {transaction?.txFrom}
              </Link>
            </div>
          </div>

          <div className={styles.item}>
            <div className={styles.title}>To:</div>
            <div className={styles.value}>
              {transaction?.wrappedEVMAccount?.readableReceipt?.to ? (
                <Link href={`/account/${transaction?.txTo}`} className={styles.link}>
                  {transaction?.txTo}
                </Link>
              ) : (
                <div>
                  <Link href={`/account/${transaction?.wrappedEVMAccount?.readableReceipt?.contractAddress}`}
                        className={styles.link}>
                    {transaction?.wrappedEVMAccount?.readableReceipt?.contractAddress}
                  </Link> (Contract created)
                </div>
              )}
            </div>
          </div>

          {transaction?.nominee && (
            <>
              <div className={styles.item}>
                <div className={styles.title}>Node Address:</div>
                <div className={styles.value}>
                  <Link href={`/account/${transaction?.nominee}`} className={styles.link}>
                    {transaction?.nominee}
                  </Link>
                </div>
              </div>
              {transaction?.transactionType === TransactionType.StakeReceipt ? (
                <div className={styles.item}>
                  <div className={styles.title}>Stake Amount:</div>
                  <div className={styles.value}>
                    {calculateFullValue(
                      transaction?.wrappedEVMAccount?.readableReceipt?.stakeInfo?.stake
                    )}{' '}
                    SHM
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.item}>
                    <div className={styles.title}>Reward:</div>
                    <div className={styles.value}>
                      {calculateFullValue(transaction?.wrappedEVMAccount?.readableReceipt?.stakeInfo?.reward)}{' '}
                      SHM
                    </div>
                  </div>
                  <div className={styles.item}>
                    <div className={styles.title}>Stake Amount:</div>
                    <div className={styles.value}>
                      {calculateFullValue(transaction?.wrappedEVMAccount?.readableReceipt?.stakeInfo?.stake)}{' '}
                      SHM
                    </div>
                  </div>
                  <div className={styles.item}>
                    <div className={styles.title}>Unstake Amount:</div>
                    <div className={styles.value}>
                      {calculateFullValue(
                        transaction?.wrappedEVMAccount?.readableReceipt?.stakeInfo?.totalUnstakeAmount
                      )}{' '}
                      SHM
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* TODO: calculate value */}
          <div className={styles.item}>
            <div className={styles.title}>Value:</div>
            <div className={styles.value}>
              {calculateFullValue(transaction?.wrappedEVMAccount?.readableReceipt?.value)}
            </div>
          </div>

          {/* TODO: calculate fee */}
          <div className={styles.item}>
            <div className={styles.title}>Transaction Fee:</div>
            <div className={styles.value}>
              {calculateFullValue(transaction?.wrappedEVMAccount?.amountSpent || '0')}
            </div>
          </div>

          {renderErc20Tokens()}
          {renderErc721Tokens()}
          {renderErc1155Tokens()}
        </div>
      )
    }
  } else {
    return <div> No Data</div>
  }
}
