import { useEffect, useState } from 'react'
import moment from 'moment'

import { AnchorLink, Chip } from '../../components'

import { calculateTokenValue, calculateValue } from '../../utils/calculateValue'
import { showTxMethod } from '../../utils/showMethod'

import { TransactionSearchType, TransactionType } from '../../types'
import { Table } from '../../components/TableComp'

interface ITransactionTable {
  data: any[]
  txType?: TransactionSearchType
}

const tempHeader = [
  {
    key: 'txHash',
    value: 'Txn Hash',
    render: (val: unknown) => (
      <AnchorLink href={`/transaction/${val}`} label={val as string} size="small" ellipsis width={150} />
    ),
  },
  {
    key: 'method',
    value: 'Method',
    render: (_: unknown, item: any) => <Chip title={showTxMethod(item)} color={item?.wrappedEVMAccount?.readableReceipt?.status === 1 ? 'success' : 'error'} size="medium" />,
  },
  {
    key: 'cycle',
    value: 'Cycle',
  },
  {
    key: 'timestamp',
    value: 'Timestamp',
    render: (val: unknown) => moment(val as string).fromNow(),
  },
]

export const TransactionTable: React.FC<ITransactionTable> = (props) => {
  const { data, txType = 1 } = props

  const [header, setHeader] = useState([])

  useEffect(() => {
    let tHeader

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
          render: (val: unknown) => (
            <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
          ),
        },
        {
          key: 'wrappedEVMAccount.readableReceipt.to',
          value: 'To',
          render: (val: unknown) =>
            val ? (
              <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
            ) : (
              'Contract Creation'
            ),
        },
        {
          key: 'wrappedEVMAccount.readableReceipt.value',
          value: 'Value',
          render: (val: unknown) => calculateValue(val),
        },
        {
          key: 'wrappedEVMAccount.amountSpent',
          value: 'Txn Fee',
          render: (val: unknown) => calculateValue(val),
        },
      ]
    }

    if (txType === TransactionSearchType.EVM_Internal) {
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
          render: (val: unknown) =>
            val ? (
              <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
            ) : (
              'Contract Creation'
            ),
        },
        {
          key: 'tokenType',
          value: 'Value',
          render: (val: unknown, item: any) => calculateTokenValue(item, val as TransactionType),
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
          render: (val: unknown) =>
            val ? (
              <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
            ) : (
              'Contract Creation'
            ),
        },
        {
          key: 'tokenType',
          value: 'Value',
          render: (val: unknown, item: any) => calculateTokenValue(item, val as TransactionType),
        },
        {
          key: 'token',
          value: 'Token',
          render: (_: unknown, item: any) => item?.contractInfo?.name || item?.contractAddress || '',
        },
        {
          key: 'transactionFee',
          value: 'Txn Fee',
          render: (val: unknown) => calculateValue(val),
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
          render: (val: unknown) =>
            val ? (
              <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
            ) : (
              'Contract Creation'
            ),
        },
        {
          key: 'tokenType',
          value: 'Token ID',
          maxChar: 30,
          render: (val: unknown, item: any) => calculateTokenValue(item, val as TransactionType),
        },
        {
          key: 'token',
          value: 'Token',
          render: (_: unknown, item: any) => item?.contractInfo?.name || item?.contractAddress || '',
        },
        {
          key: 'transactionFee',
          value: 'Txn Fee',
          render: (val: unknown) => calculateValue(val),
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
          render: (val: unknown) =>
            val ? (
              <AnchorLink href={`/account/${val}`} label={val as string} size="small" ellipsis width={150} />
            ) : (
              'Contract Creation'
            ),
        },
        {
          key: 'tokenType',
          value: 'Token ID',
          render: (val: unknown, item: any) => calculateTokenValue(item, val as TransactionType, true),
        },
        {
          key: 'tokenType',
          value: 'Value',
          render: (val: unknown, item: any) => calculateTokenValue(item, val as TransactionType),
        },
        {
          key: 'contractAddress',
          value: 'Token',
          render: (val: unknown, item: any) => {
            return item?.contractInfo?.name ? (
              item?.contractInfo?.name
            ) : (
              <AnchorLink href={`/token/${val}`} label={val as string} size="small" ellipsis width={150} />
            )
          },
        },
        {
          key: 'transactionFee',
          value: 'Txn Fee',
          render: (val: unknown) => calculateValue(val),
        },
      ]
    }

    // @ts-ignore
    setHeader([...tempHeader, ...tHeader])
  }, [txType])

  if (!header) return null

  return <Table data={data} columns={header} />
}
