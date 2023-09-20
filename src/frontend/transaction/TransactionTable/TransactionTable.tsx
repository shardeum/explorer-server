import React, { useEffect, useState } from 'react'
import moment from 'moment'

import { AnchorLink, Chip } from '../../components'

import { calculateTokenValue, calculateValue } from '../../utils/calculateValue'
import { showTxMethod } from '../../utils/showMethod'

import {
  OriginalTxData,
  TokenTx,
  Transaction,
  TransactionSearchType,
  TransactionType,
  ReadableReceipt,
} from '../../../types'
import { Table } from '../../components/TableComp'
import { IColumnProps } from '../../components/TableComp/Table'

interface ITransactionTable {
  data: (Transaction | TokenTx | OriginalTxData)[]
  loading?: boolean
  txType?: TransactionSearchType
}

const tempHeader: IColumnProps<ReadableReceipt | Transaction | TokenTx | OriginalTxData>[] = [
  {
    key: 'txHash',
    value: 'Txn Hash',
    render: (val: string, item: Transaction | TokenTx | OriginalTxData) => (
      <AnchorLink
        href={`/transaction/${val}?txId=${item?.txId}`}
        label={val as string}
        size="small"
        ellipsis
        width={150}
      />
    ),
  },
  {
    key: 'method',
    value: 'Method',
    render: (_: unknown, item: Transaction | TokenTx | OriginalTxData) => (
      <Chip
        title={showTxMethod(item)}
        color={
          'wrappedEVMAccount' in item
            ? item?.wrappedEVMAccount?.readableReceipt?.status === 0
              ? 'error'
              : 'success'
            : 'gray'
        }
        size="medium"
      />
    ),
  },
  {
    key: 'cycle',
    value: 'Cycle',
  },
  {
    key: 'timestamp',
    value: 'Timestamp',
    render: (val: string | TransactionType) => moment(val as string).fromNow(),
  },
]

export const TransactionTable: React.FC<ITransactionTable> = (props) => {
  const { data, txType = TransactionSearchType.All } = props

  const [header, setHeader] = useState<
    IColumnProps<ReadableReceipt | Transaction | TokenTx | OriginalTxData>[]
  >([])

  useEffect(() => {
    let tHeader: IColumnProps<ReadableReceipt | Transaction | TokenTx | OriginalTxData>[] = []

    if (
      txType === TransactionSearchType.AllExceptInternalTx ||
      txType === TransactionSearchType.NodeRewardReceipt ||
      txType === TransactionSearchType.StakeReceipt ||
      txType === TransactionSearchType.UnstakeReceipt
    ) {
      tHeader = [
        {
          key: 'wrappedEVMAccount.readableReceipt.from',
          value: 'From',
          render: (val: string | TransactionType) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'wrappedEVMAccount.readableReceipt',
          value: 'To',
          render: (val: ReadableReceipt) =>
            val &&
            (val?.to ? (
              <AnchorLink href={`/account/${val.to}`} label={val.to} size="small" ellipsis width={150} />
            ) : (
              <AnchorLink
                href={`/account/${val.contractAddress}`}
                label={'Contract creation'}
                size="small"
                ellipsis
                width={150}
              />
            )),
        },
        {
          key: 'wrappedEVMAccount.readableReceipt.value',
          value: 'Value',
          render: (val: string | TransactionType) => calculateValue(`${val}` as string),
        },
        {
          key: 'wrappedEVMAccount.amountSpent',
          value: 'Txn Fee',
          render: (val: string | TransactionType) => calculateValue(`${val}` as string),
        },
      ]
    }

    if (txType === TransactionSearchType.EVM_Internal) {
      tHeader = [
        {
          key: 'tokenFrom',
          value: 'From',
          render: (val: string | TransactionType) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenTo',
          value: 'To',
          render: (val: string | TransactionType) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenType',
          value: 'Value',
          render: (val: string | TransactionType, item?: Transaction | TokenTx) =>
            calculateTokenValue(item as TokenTx, val as TransactionType),
        },
        {
          key: 'transactionFee',
          value: 'Txn Fee',
        },
      ]
    }

    if (txType === TransactionSearchType.ERC_20) {
      tHeader = [
        {
          key: 'tokenFrom',
          value: 'From',
          render: (val: unknown) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenTo',
          value: 'To',
          render: (val: unknown) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenType',
          value: 'Value',
          render: (val: string | TransactionType, item?: Transaction | TokenTx) =>
            calculateTokenValue(item as TokenTx, val as TransactionType),
        },
        {
          key: 'token',
          value: 'Token',
          render: (_: string | TransactionType, item?: Transaction | TokenTx) =>
            (item as TokenTx)?.contractInfo?.name || (item as TokenTx)?.contractAddress || '',
        },
        {
          key: 'transactionFee',
          value: 'Txn Fee',
          render: (val: string | TransactionType) => calculateValue(`${val}` as string),
        },
      ]
    }

    if (txType === TransactionSearchType.ERC_721) {
      tHeader = [
        {
          key: 'tokenFrom',
          value: 'From',
          render: (val: unknown) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenTo',
          value: 'To',
          render: (val: unknown) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenType',
          value: 'Token ID',
          maxChar: 30,
          render: (val: TransactionType | string, item: Transaction | TokenTx) =>
            calculateTokenValue(item as TokenTx, val as TransactionType, true),
        },
        {
          key: 'token',
          value: 'Token',
          render: (_: TransactionType | string, item: Transaction | TokenTx) =>
            (item as TokenTx)?.contractInfo?.name || (item as TokenTx)?.contractAddress || '',
        },
        {
          key: 'transactionFee',
          value: 'Txn Fee',
          render: (val: TransactionType | string) => calculateValue(`${val}` as string),
        },
      ]
    }

    if (txType === TransactionSearchType.ERC_1155) {
      tHeader = [
        {
          key: 'tokenFrom',
          value: 'From',
          render: (val: unknown) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenTo',
          value: 'To',
          render: (val: unknown) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'tokenType',
          value: 'Token ID',
          render: (val: string | TransactionType, item: Transaction | TokenTx) =>
            calculateTokenValue(item as TokenTx, val as TransactionType, true),
        },
        {
          key: 'tokenType',
          value: 'Value',
          render: (val: string | TransactionType, item: Transaction | TokenTx) =>
            calculateTokenValue(item as TokenTx, val as TransactionType),
        },
        {
          key: 'contractAddress',
          value: 'Token',
          render: (val: string | TransactionType, item: Transaction | TokenTx) => {
            return (item as TokenTx)?.contractInfo?.name ? (
              (item as TokenTx)?.contractInfo?.name
            ) : (
              <AnchorLink href={`/token/${val}`} label={val as string} size="small" ellipsis width={150} />
            )
          },
        },
        {
          key: 'transactionFee',
          value: 'Txn Fee',
          render: (val: string | TransactionType) => calculateValue(`${val}` as string),
        },
      ]
    }

    if (txType === TransactionSearchType.Pending) {
      tHeader = [
        {
          key: 'originalTxData.readableReceipt.from',
          value: 'From',
          render: (val: string) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'originalTxData.readableReceipt.to',
          value: 'To',
          render: (val: string) =>
            val ? (
              <AnchorLink href={`/account/${val}`} label={val} size="small" ellipsis width={150} />
            ) : (
              'Contract Creation'
            ),
        },
        {
          key: 'originalTxData.readableReceipt.value',
          value: 'Value',
          render: (val: string) => calculateValue(`${val}` as string),
        },
      ]
    }

    setHeader([...tempHeader, ...tHeader])
  }, [txType])

  if (!header) return null

  return <Table data={data} columns={header} />
}
