import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import {
  AccountType,
  Transaction,
  TokenTx,
  Account,
  Token,
  TransactionType,
  TransactionSearchType,
  WrappedEVMAccount,
  WrappedDataReceipt,
  InternalTXType,
  TxMethodFilter,
  ContractInfo,
} from '../types'
import Web3 from 'web3'
import * as AccountDB from './account'
import { decodeTx, ZERO_ETH_ADDRESS } from '../class/TxDecoder'
import { Utils as StringUtils } from '@shardus/types'

export const ERC20_METHOD_DIC = {
  '0xa9059cbb': 'transfer',
  '0xa978501e': 'transferFrom',
}

type DbTransaction = Transaction & {
  wrappedEVMAccount: string
  originalTxData: string
  contractInfo: string
}

type DbTokenTx = TokenTx & {
  contractInfo: string
}

export async function insertTransaction(transaction: Transaction): Promise<void> {
  try {
    const fields = Object.keys(transaction).join(', ')
    const placeholders = Object.keys(transaction).fill('?').join(', ')
    const values = extractValues(transaction)
    const sql = 'INSERT OR REPLACE INTO transactions (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Transaction', transaction.txId, transaction.txHash)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert Transaction or it is already stored in to database', transaction.txId)
  }
}

export async function bulkInsertTransactions(transactions: Transaction[]): Promise<void> {
  try {
    const fields = Object.keys(transactions[0]).join(', ')
    const placeholders = Object.keys(transactions[0]).fill('?').join(', ')
    const values = extractValuesFromArray(transactions)
    let sql = 'INSERT OR REPLACE INTO transactions (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < transactions.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully bulk inserted transactions', transactions.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert transactions', transactions.length)
  }
}

export async function updateTransaction(_txId: string, transaction: Partial<Transaction>): Promise<void> {
  try {
    const sql = `UPDATE transactions SET result = $result, cycle = $cycle, wrappedEVMAccount = $wrappedEVMAccount, txHash = $txHash WHERE txId = $txId `
    await db.run(sql, {
      $cycle: transaction.cycle,
      $wrappedEVMAccount: transaction.wrappedEVMAccount && StringUtils.safeStringify(transaction.wrappedEVMAccount),
      $txHash: transaction.txHash,
      $txId: transaction.txId,
    })
    if (config.verbose) console.log('Successfully Updated Transaction', transaction.txId, transaction.txHash)
  } catch (e) {
    /* prettier-ignore */ if (config.verbose) console.log(e);
    console.log('Unable to update Transaction', transaction.txId, transaction.txHash)
  }
}

export async function insertTokenTransaction(tokenTx: TokenTx): Promise<void> {
  try {
    const fields = Object.keys(tokenTx).join(', ')
    const placeholders = Object.keys(tokenTx).fill('?').join(', ')
    const values = extractValues(tokenTx)
    const sql = 'INSERT OR REPLACE INTO tokenTxs (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Token Transaction', tokenTx.txHash)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert Token Transaction or it is already stored in to database', tokenTx.txHash)
  }
}

export async function bulkInsertTokenTransactions(tokenTxs: TokenTx[]): Promise<void> {
  try {
    const fields = Object.keys(tokenTxs[0]).join(', ')
    const placeholders = Object.keys(tokenTxs[0]).fill('?').join(', ')
    const values = extractValuesFromArray(tokenTxs)
    let sql = 'INSERT OR REPLACE INTO tokenTxs (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < tokenTxs.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully inserted token transactions', tokenTxs.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert token transactions', tokenTxs.length)
  }
}

interface RawTransaction {
  accountId: string
  cycleNumber: number
  data: WrappedEVMAccount
  originalTxData: {
    duration: number
    internalTXType: InternalTXType
    isInternalTx: boolean
    nominator: string
    nominee: string
    sign: {
      owner: string
      sig: string
    }
    timestamp: number
  }
  result: { txIdShort: string; txResult: string }
  sign: {
    owner: string
    sig: string
  }
  timestamp: number
  txId: string
}

function isReceiptData(obj?: WrappedEVMAccount | null): obj is WrappedEVMAccount & WrappedDataReceipt {
  const accountType = obj?.accountType
  return (
    accountType === AccountType.Receipt ||
    accountType === AccountType.NodeRewardReceipt ||
    accountType === AccountType.StakeReceipt ||
    accountType === AccountType.UnstakeReceipt ||
    accountType === AccountType.InternalTxReceipt
  )
}

export async function processTransactionData(transactions: RawTransaction[]): Promise<void> {
  console.log('transactions size', transactions.length)
  if (transactions && transactions.length <= 0) return
  const bucketSize = 1000
  const combineAccounts: Account[] = []
  const existingAccounts: string[] = [] // To save perf on querying from the db again and again, save the existing account that is queried once in memory
  let combineTransactions: Transaction[] = []
  let combineTokenTransactions: TokenTx[] = [] // For TransactionType (Internal ,ERC20, ERC721)
  let combineTokenTransactions2: TokenTx[] = [] // For TransactionType (ERC1155)
  let combineTokens: Token[] = [] // For Tokens owned by an address
  for (const transaction of transactions) {
    if (isReceiptData(transaction.data)) {
      const txObj: Transaction = {
        txId: transaction.data?.txId,
        cycle: transaction.cycleNumber,
        blockNumber: parseInt(transaction.data.readableReceipt.blockNumber),
        blockHash: transaction.data.readableReceipt.blockHash,
        timestamp: transaction.timestamp,
        wrappedEVMAccount: transaction.data,
        transactionType:
          transaction.data.accountType === AccountType.Receipt
            ? TransactionType.Receipt
            : transaction.data.accountType === AccountType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : transaction.data.accountType === AccountType.StakeReceipt
            ? TransactionType.StakeReceipt
            : transaction.data.accountType === AccountType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt,
        txHash: transaction.data.ethAddress,
        txFrom: transaction.data.readableReceipt.from,
        txTo: transaction.data.readableReceipt.to
          ? transaction.data.readableReceipt.to
          : transaction.data.readableReceipt.contractAddress,
        originalTxData: {},
        internalTXType: transaction.data.readableReceipt.internalTx
          ? transaction.data.readableReceipt.internalTx.internalTXType
          : null,
      }

      const { txs, accs, tokens } = await decodeTx(txObj)
      for (const acc of accs) {
        if (acc === ZERO_ETH_ADDRESS) continue
        const index = combineAccounts.findIndex(
          (a) => a.accountId === acc.slice(2).toLowerCase() + '0'.repeat(24)
        )
        if (index > -1) {
          // eslint-disable-next-line security/detect-object-injection
          const accountExist = combineAccounts[index]
          accountExist.timestamp = txObj.timestamp
          combineAccounts.splice(index, 1)
          combineAccounts.push(accountExist)
        } else {
          const addressToCreate = acc
          // To save performance on querying from the db again and again, save it in memory
          if (existingAccounts.includes(addressToCreate)) {
            continue
          }
          const accountExist = await AccountDB.queryAccountByAccountId(
            addressToCreate.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
          )
          if (config.verbose) console.log('addressToCreate', addressToCreate, accountExist)
          if (!accountExist) {
            // Account is not created in the EVM yet
            // Make a sample account with that address to show the account info in the explorer
            const accObj = {
              accountId: addressToCreate.slice(2).toLowerCase() + '0'.repeat(24),
              cycle: txObj.cycle,
              timestamp: txObj.timestamp,
              ethAddress: addressToCreate,
              account: {
                nonce: '0',
                balance: '0',
              } as WrappedEVMAccount,
              hash: 'Ox',
              accountType: AccountType.Account,
              isGlobal: false,
            }
            combineAccounts.push(accObj)
          } else {
            existingAccounts.push(addressToCreate)
          }
        }
      }
      for (const tx of txs) {
        const accountExist = await AccountDB.queryAccountByAccountId(
          tx.contractAddress.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
        )
        let contractInfo = {} as ContractInfo
        if (accountExist && accountExist.contractInfo) {
          contractInfo = accountExist.contractInfo
        }
        // wrapped data must be a receipt here. this type guard ensures that
        if ('readableReceipt' in txObj.wrappedEVMAccount) {
          const obj: TokenTx = {
            ...tx,
            txId: txObj.txId,
            txHash: txObj.txHash,
            cycle: txObj.cycle,
            timestamp: txObj.timestamp,
            transactionFee: txObj.wrappedEVMAccount.amountSpent ?? '0',
            contractInfo,
            internalTXType: txObj.internalTXType,
          }
          if (tx.tokenType === TransactionType.ERC_1155) {
            combineTokenTransactions2.push(obj)
          } else {
            combineTokenTransactions.push(obj)
          }
        }
      }
      combineTokens = [...combineTokens, ...tokens]
      combineTransactions.push(txObj)
    }
    if (combineTransactions.length >= bucketSize) {
      await bulkInsertTransactions(combineTransactions)
      combineTransactions = []
    }
    if (combineTokenTransactions.length >= bucketSize) {
      await bulkInsertTokenTransactions(combineTokenTransactions)
      combineTokenTransactions = []
    }
    if (combineTokenTransactions2.length >= bucketSize) {
      await bulkInsertTokenTransactions(combineTokenTransactions2)
      combineTokenTransactions2 = []
    }
    if (combineTokens.length >= bucketSize) {
      await AccountDB.bulkInsertTokens(combineTokens)
      combineTokens = []
    }
  }
  if (combineAccounts.length > 0) {
    let limit = bucketSize
    let j = limit
    let accountsToSave: Account[]
    for (let i = 0; i < combineAccounts.length; i = j) {
      accountsToSave = combineAccounts.slice(i, limit)
      await AccountDB.bulkInsertAccounts(accountsToSave)
      j = limit
      limit += bucketSize
    }
  }
  if (combineTransactions.length > 0) await bulkInsertTransactions(combineTransactions)
  if (combineTokenTransactions.length > 0) await bulkInsertTokenTransactions(combineTokenTransactions)
  if (combineTokenTransactions2.length > 0) await bulkInsertTokenTransactions(combineTokenTransactions2)
  if (combineTokens.length > 0) await AccountDB.bulkInsertTokens(combineTokens)
}

export const getWeb3 = function (): Promise<Web3> {
  return new Promise((resolve, reject) => {
    try {
      const web3 = new Web3(new Web3.providers.HttpProvider(`${config.rpcUrl}`))
      resolve(web3)
    } catch (e) {
      console.error(e)
      reject('Cannot get web3 instance')
    }
  })
}

export async function queryTransactionCount(
  address?: string,
  txType?: TransactionSearchType,
  filterAddress?: string,
  filterType?: TxMethodFilter
): Promise<number> {
  let transactions: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  try {
    if (address) {
      if (filterType) {
        const sql = `SELECT COUNT(*) FROM transactions WHERE ${filterType}=?`
        transactions = await db.get(sql, [address])
      } else if (!txType) {
        const sql = `SELECT COUNT(*) FROM transactions WHERE txFrom=? OR txTo=? OR nominee=?`
        transactions = await db.get(sql, [address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE transactionType!=? AND (txFrom=? OR txTo=? OR nominee=?)`
        transactions = await db.get(sql, [ty, address, address, address])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        let sql = `SELECT COUNT(*) FROM transactions WHERE transactionType=? AND (txFrom=? OR txTo=? OR nominee=?)`
        if (txType === TransactionSearchType.InternalTxReceipt) {
          sql = `SELECT COUNT(*) FROM transactions WHERE (transactionType!=? AND transactionType!=? AND transactionType!=?) AND (txFrom=? OR txTo=? OR nominee=?)`
          transactions = await db.get(sql, [
            TransactionType.Receipt,
            TransactionType.StakeReceipt,
            TransactionType.UnstakeReceipt,
            address,
            address,
            address,
          ])
        } else {
          transactions = await db.get(sql, [ty, address, address, address])
        }
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT COUNT(*) FROM tokenTxs WHERE (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=?`
        transactions = await db.get(sql, [address, address, address, ty])
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          const sql = `SELECT COUNT(*) FROM tokenTxs WHERE contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND NOT tokenType=?`
          transactions = await db.get(sql, [
            address,
            filterAddress,
            filterAddress,
            filterAddress,
            TransactionType.EVM_Internal,
          ])
        } else {
          const sql = `SELECT COUNT(*) FROM tokenTxs WHERE contractAddress=? AND NOT tokenType=?`
          transactions = await db.get(sql, [address, TransactionType.EVM_Internal])
        }
      }
    } else if (txType || txType === TransactionSearchType.All) {
      if (txType === TransactionSearchType.All) {
        const sql = `SELECT COUNT(*) FROM transactions`
        transactions = await db.get(sql, [])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const sql = `SELECT COUNT(*) FROM transactions WHERE (transactionType=? OR transactionType=? OR transactionType=?)`
        transactions = await db.get(sql, [
          TransactionType.Receipt,
          TransactionType.StakeReceipt,
          TransactionType.UnstakeReceipt,
        ])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE transactionType=?`
        transactions = await db.get(sql, [ty])
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT COUNT(*) FROM tokenTxs WHERE tokenType=?`
        transactions = await db.get(sql, [ty])
      }
    } else {
      const sql = `SELECT COUNT(*) FROM transactions`
      transactions = await db.get(sql)
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('transactions count', transactions)

  return transactions['COUNT(*)'] || 0
}

export async function queryTransactions(
  skip = 0,
  limit = 10,
  address?: string,
  txType?: TransactionSearchType,
  filterAddress?: string,
  filterType?: TxMethodFilter
): Promise<(DbTransaction | DbTokenTx)[]> {
  let transactions: (DbTransaction | DbTokenTx)[] = []
  try {
    if (address) {
      if (filterType) {
        const sql = `SELECT * FROM transactions WHERE ${filterType}=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [address])
      } else if (!txType) {
        const sql = `SELECT * FROM transactions WHERE (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        // const sql = `SELECT * FROM transactions WHERE (transactionType=? OR transactionType=? OR transactionType=?) AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        // transactions = await db.all(sql, [
        //   TransactionType.Receipt,
        //   TransactionType.StakeReceipt,
        //   TransactionType.UnstakeReceipt,
        //   address,
        //   address,
        //   address,
        // ])
        const sql = `SELECT * FROM transactions WHERE transactionType!=? AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [TransactionType.InternalTxReceipt, address, address, address])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        let sql = `SELECT * FROM transactions WHERE transactionType=? AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        if (txType === TransactionSearchType.InternalTxReceipt) {
          sql = `SELECT * FROM transactions WHERE (transactionType!=? AND transactionType!=? AND transactionType!=?) AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [
            TransactionType.Receipt,
            TransactionType.StakeReceipt,
            TransactionType.UnstakeReceipt,
            address,
            address,
            address,
          ])
        } else transactions = await db.all(sql, [ty, address, address, address])
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT * FROM tokenTxs WHERE (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [address, address, address, ty])
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          const sql = `SELECT * FROM tokenTxs WHERE contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND NOT (tokenType=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [
            address,
            filterAddress,
            filterAddress,
            filterAddress,
            TransactionType.EVM_Internal,
          ])
        } else {
          const sql = `SELECT * FROM tokenTxs WHERE contractAddress=? AND NOT (tokenType=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [address, TransactionType.EVM_Internal])
        }
      }
    } else if (txType) {
      if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT * FROM transactions WHERE transactionType!=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [ty])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        let sql = `SELECT * FROM transactions WHERE transactionType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        if (txType === TransactionSearchType.InternalTxReceipt) {
          sql = `SELECT * FROM transactions WHERE transactionType!=? AND transactionType!=? AND transactionType!=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [
            TransactionType.Receipt,
            TransactionType.StakeReceipt,
            TransactionType.UnstakeReceipt,
          ])
        } else {
          transactions = await db.all(sql, [ty])
        }
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT * FROM tokenTxs WHERE tokenType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [ty])
      }
    } else {
      const sql = `SELECT * FROM transactions ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
      transactions = await db.all(sql)
    }

    transactions.forEach((transaction: DbTokenTx | DbTransaction) => {
      if ('transactionType' in transaction) deserializeDbTransaction(transaction)
      else if ('tokenType' in transaction) deserializeDbToken(transaction)
    })

    if (config.verbose) console.log('transactions', transactions)
  } catch (e) {
    console.log(e)
  }

  return transactions
}

export async function queryTransactionByTxId(txId: string, detail = false): Promise<Transaction | null> {
  try {
    const sql = `SELECT * FROM transactions WHERE txId=?`
    const transaction: DbTransaction = await db.get(sql, [txId])
    if (transaction) {
      if (transaction.wrappedEVMAccount)
        transaction.wrappedEVMAccount = StringUtils.safeJsonParse(transaction.wrappedEVMAccount)
      if (transaction.originalTxData) transaction.originalTxData = StringUtils.safeJsonParse(transaction.originalTxData)
    }
    if (detail) {
      const sql = `SELECT * FROM tokenTxs WHERE txId=?`
      const tokenTxs: DbTokenTx[] = await db.all(sql, [txId])
      if (tokenTxs.length > 0) {
        ;(transaction as Transaction).tokenTxs = tokenTxs
      }
    }
    if (config.verbose) console.log('transaction txId', transaction)
    return transaction
  } catch (e) {
    console.log(e)
  }
  return null
}

export async function queryTransactionByHash(txHash: string, detail = false): Promise<Transaction[] | null> {
  try {
    const sql = `SELECT * FROM transactions WHERE txHash=? ORDER BY cycle DESC, timestamp DESC`
    const transactions: DbTransaction[] = await db.all(sql, [txHash])
    if (transactions.length > 0) {
      for (const transaction of transactions) {
        deserializeDbTransaction(transaction)
        if (detail) {
          const sql = `SELECT * FROM tokenTxs WHERE txId=? ORDER BY cycle DESC, timestamp DESC`
          const tokenTxs: DbTokenTx[] = await db.all(sql, [transaction.txId])
          if (tokenTxs.length > 0) {
            tokenTxs.forEach((tokenTx: DbTokenTx) => deserializeDbToken(tokenTx))
            transaction.tokenTxs = tokenTxs
          }
        }
      }
    }
    if (config.verbose) console.log('transaction hash', transactions)
    return transactions
  } catch (e) {
    console.log(e)
  }
  return null
}

export async function queryTransactionsForCycle(cycleNumber: number): Promise<Transaction[]> {
  let transactions: DbTransaction[] = []
  try {
    const sql = `SELECT * FROM transactions WHERE cycle=? ORDER BY timestamp ASC`
    transactions = await db.all(sql, [cycleNumber])
    if (transactions.length > 0) {
      transactions.forEach((transaction: DbTransaction) => deserializeDbTransaction(transaction))
    }
    if (config.verbose) console.log('transactions for cycle', cycleNumber, transactions)
  } catch (e) {
    console.log('exception when querying transactions for cycle', cycleNumber, e)
  }
  return transactions
}

export async function queryTransactionsBetweenCycles(
  skip = 0,
  limit = 10,
  start: number,
  end: number,
  address?: string,
  txType?: TransactionSearchType,
  filterAddress?: string
): Promise<(DbTransaction | DbTokenTx)[]> {
  let transactions: (DbTransaction | DbTokenTx)[] = []
  try {
    if (address) {
      if (!txType || TransactionSearchType.All) {
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType!=? AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, ty, address, address, address])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        let sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType=? AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        if (txType === TransactionSearchType.InternalTxReceipt) {
          sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (transactionType!=? AND transactionType!=? AND transactionType!=?) AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [
            start,
            end,
            TransactionType.Receipt,
            TransactionType.StakeReceipt,
            TransactionType.UnstakeReceipt,
            address,
            address,
            address,
          ])
        } else transactions = await db.all(sql, [start, end, ty, address, address, address])
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT * FROM tokenTxs WHERE cycle BETWEEN ? and ? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, address, address, address, ty])
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          const sql = `SELECT * FROM tokenTxs WHERE cycle BETWEEN ? and ? AND contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND NOT (tokenType=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [
            start,
            end,
            address,
            filterAddress,
            filterAddress,
            filterAddress,
            TransactionType.EVM_Internal,
          ])
        } else {
          const sql = `SELECT * FROM tokenTxs WHERE cycle BETWEEN ? and ? AND contractAddress=? AND NOT (tokenType=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [start, end, address, TransactionType.EVM_Internal])
        }
      }
    } else if (txType) {
      if (txType === TransactionSearchType.AllExceptInternalTx) {
        // const ty = TransactionType.InternalTxReceipt
        // const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType!=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        // transactions = await db.all(sql, [start, end, ty])

        // This seems to be faster than the above query
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (transactionType=? OR transactionType=? OR transactionType=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [
          start,
          end,
          TransactionType.Receipt,
          TransactionType.StakeReceipt,
          TransactionType.UnstakeReceipt,
        ])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        let sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        if (txType === TransactionSearchType.InternalTxReceipt) {
          sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (transactionType!=? AND transactionType!=? AND transactionType!=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [
            start,
            end,
            TransactionType.Receipt,
            TransactionType.StakeReceipt,
            TransactionType.UnstakeReceipt,
          ])
        } else {
          transactions = await db.all(sql, [start, end, ty])
        }
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT * FROM tokenTxs WHERE cycle BETWEEN ? and ? AND tokenType=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, ty])
      }
    } else {
      const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
      transactions = await db.all(sql, [start, end])
    }
    if (transactions.length > 0) {
      transactions.forEach((transaction: DbTransaction | DbTokenTx) => {
        if ('transactionType' in transaction && transaction.transactionType)
          deserializeDbTransaction(transaction)
        else if ('tokenType' in transaction && transaction.tokenType) deserializeDbToken(transaction)
      })
    }
  } catch (e) {
    console.log(e)
  }

  if (config.verbose) console.log('transactions betweeen cycles', transactions)
  return transactions
}

export async function queryTransactionCountBetweenCycles(
  start: number,
  end: number,
  address?: string,
  txType?: TransactionSearchType,
  filterAddress?: string
): Promise<number> {
  let transactions: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  try {
    if (address) {
      if (!txType) {
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?)`
        transactions = await db.get(sql, [start, end, address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType!=? AND (txFrom=? OR txTo=? OR nominee=?)`
        transactions = await db.get(sql, [start, end, ty, address, address, address])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        let sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType=? AND (txFrom=? OR txTo=? OR nominee=?)`
        if (txType === TransactionSearchType.InternalTxReceipt) {
          sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (transactionType!=? AND transactionType!=? AND transactionType!=?) AND (txFrom=? OR txTo=? OR nominee=?)`
          transactions = await db.get(sql, [
            start,
            end,
            TransactionType.Receipt,
            TransactionType.StakeReceipt,
            TransactionType.UnstakeReceipt,
            address,
            address,
            address,
          ])
        } else transactions = await db.get(sql, [start, end, ty, address, address, address])
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT COUNT(*) FROM tokenTxs WHERE cycle BETWEEN ? and ? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=?`
        transactions = await db.get(sql, [start, end, address, address, address, ty])
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          const sql = `SELECT COUNT(*) FROM tokenTxs WHERE cycle BETWEEN ? and ? AND contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND NOT tokenType=?`
          transactions = await db.get(sql, [
            start,
            end,
            address,
            filterAddress,
            filterAddress,
            filterAddress,
            TransactionType.EVM_Internal,
          ])
        } else {
          const sql = `SELECT COUNT(*) FROM tokenTxs WHERE cycle BETWEEN ? and ? AND contractAddress=? AND NOT tokenType=?`
          transactions = await db.get(sql, [start, end, address, TransactionType.EVM_Internal])
        }
      }
    } else if (txType || txType === TransactionSearchType.All) {
      if (txType === TransactionSearchType.All) {
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ?`
        transactions = await db.get(sql, [start, end])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        // const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (transactionType=? OR transactionType=? OR transactionType=?)`
        transactions = await db.get(sql, [
          start,
          end,
          TransactionType.Receipt,
          TransactionType.StakeReceipt,
          TransactionType.UnstakeReceipt,
        ])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        let sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType=?`
        if (txType === TransactionSearchType.InternalTxReceipt) {
          // This is taking too long to respond
          // transactions = await db.get(sql, [start, end, ty])
          sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ?`
          transactions = await db.get(sql, [start, end])
          const totalTxs = transactions['COUNT(*)'] || 0

          sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (transactionType=? OR transactionType=? OR transactionType=?)`
          transactions = await db.get(sql, [
            start,
            end,
            TransactionType.Receipt,
            TransactionType.StakeReceipt,
            TransactionType.UnstakeReceipt,
          ])
          const totalTxsExceptInternalTx = transactions['COUNT(*)'] || 0
          transactions['COUNT(*)'] = totalTxs - totalTxsExceptInternalTx
        } else {
          transactions = await db.get(sql, [start, end, ty])
        }
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT COUNT(*) FROM tokenTxs WHERE cycle BETWEEN ? and ? AND tokenType=?`
        transactions = await db.get(sql, [start, end, ty])
      }
    } else {
      const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ?`
      transactions = await db.get(sql, [start, end])
    }
  } catch (e) {
    console.log(e)
  }

  if (config.verbose) console.log('transactions count between cycles', transactions)

  return transactions['COUNT(*)'] || 0
}

export async function queryTransactionCountByCycles(
  start: number,
  end: number,
  txType?: TransactionSearchType
): Promise<{ cycle: number; transactions: number }[]> {
  let transactions: { cycle: number; 'COUNT(*)': number }[] = []
  try {
    if (
      txType === TransactionSearchType.Receipt ||
      txType === TransactionSearchType.NodeRewardReceipt ||
      txType === TransactionSearchType.StakeReceipt ||
      txType === TransactionSearchType.UnstakeReceipt ||
      txType === TransactionSearchType.InternalTxReceipt
    ) {
      const ty =
        txType === TransactionSearchType.Receipt
          ? TransactionType.Receipt
          : txType === TransactionSearchType.NodeRewardReceipt
          ? TransactionType.NodeRewardReceipt
          : txType === TransactionSearchType.StakeReceipt
          ? TransactionType.StakeReceipt
          : txType === TransactionSearchType.UnstakeReceipt
          ? TransactionType.UnstakeReceipt
          : TransactionType.InternalTxReceipt
      let sql = `SELECT cycle, COUNT(*) FROM transactions WHERE transactionType=? GROUP BY cycle HAVING cycle BETWEEN ? AND ? ORDER BY cycle ASC`
      if (txType === TransactionSearchType.InternalTxReceipt) {
        sql = `SELECT cycle, COUNT(*) FROM transactions WHERE transactionType!=? AND transactionType!=? AND transactionType!=? GROUP BY cycle HAVING cycle BETWEEN ? AND ? ORDER BY cycle ASC`
        transactions = await db.all(sql, [
          TransactionType.Receipt,
          TransactionType.StakeReceipt,
          TransactionType.UnstakeReceipt,
          start,
          end,
        ])
      } else transactions = await db.all(sql, [ty, start, end])
    } else {
      const sql = `SELECT cycle, COUNT(*) FROM transactions GROUP BY cycle HAVING cycle BETWEEN ? AND ? ORDER BY cycle ASC`
      transactions = await db.all(sql, [start, end])
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Transaction count by cycles', transactions)

  return transactions.map((receipt) => {
    return {
      cycle: receipt.cycle,
      transactions: receipt['COUNT(*)'],
    }
  })
}

export async function queryInternalTransactionCountByCycles(
  start,
  end
): Promise<{ cycle: number; internalTXType: number; count: number }[]> {
  let transactions = []
  try {
    const sql = `
      SELECT cycle, internalTXType, COUNT(*) as count 
      FROM transactions 
      WHERE transactionType = ${TransactionType.InternalTxReceipt} 
      AND cycle BETWEEN ? AND ? 
      GROUP BY cycle, internalTXType 
      ORDER BY cycle ASC`

    transactions = await db.all(sql, [start, end])
  } catch (e) {
    console.error(e)
  }

  return transactions.map(({ cycle, internalTXType, count }) => ({
    cycle,
    internalTXType,
    count,
  }))
}

export async function queryTransactionCountByTimestamp(
  beforeTimestamp: number,
  afterTimestamp: number,
  address?: string,
  txType?: TransactionSearchType,
  filterAddress?: string
): Promise<number> {
  let transactions: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  let sql = `SELECT COUNT(*) FROM transactions WHERE `
  if (txType) {
    if (
      txType === TransactionSearchType.EVM_Internal ||
      txType === TransactionSearchType.ERC_20 ||
      txType === TransactionSearchType.ERC_721 ||
      txType === TransactionSearchType.ERC_1155 ||
      txType === TransactionSearchType.TokenTransfer
    )
      sql = `SELECT COUNT(*) FROM tokenTxs WHERE `
  }
  const values: (number | string)[] = []
  if (afterTimestamp > 0) {
    sql += `timestamp>? `
    values.push(afterTimestamp)
  }
  if (beforeTimestamp > 0) {
    if (afterTimestamp > 0) sql += `AND timestamp<? `
    else sql += `timestamp<? `
    values.push(beforeTimestamp)
  }
  try {
    if (address) {
      if (!txType) {
        sql += `AND (txFrom=? OR txTo=? OR nominee=?)`
        values.push(address, address, address)
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        sql = `AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType!=?`
        values.push(address, address, address, ty)
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        sql += `AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType=?`
        values.push(address, address, address, ty)
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        sql += `AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=?`
        values.push(address, address, address, ty)
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          sql += `AND contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND NOT tokenType=?`
          values.push(address, filterAddress, filterAddress, filterAddress, TransactionType.EVM_Internal)
        } else {
          sql += `AND contractAddress=? AND NOT tokenType=?`
          values.push(address, TransactionType.EVM_Internal)
        }
      }
    } else if (txType) {
      if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        sql += `AND transactionType!=?`
        values.push(ty)
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        sql += `AND transactionType=?`
        values.push(ty)
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        sql += `AND tokenType=?`
        values.push(ty)
      }
    }
    transactions = await db.get(sql, values)
  } catch (e) {
    console.log(e)
  }

  if (config.verbose) console.log('transactions count by timestamp', transactions)

  return transactions['COUNT(*)'] || 0
}

export async function queryTransactionsByTimestamp(
  skip = 0,
  limit = 10,
  beforeTimestamp: number,
  afterTimestamp: number,
  address?: string,
  txType?: TransactionSearchType,
  filterAddress?: string
): Promise<(DbTransaction | DbTokenTx)[]> {
  let transactions: (DbTransaction | DbTokenTx)[] = []
  let sql = `SELECT * FROM transactions WHERE `
  if (txType) {
    if (
      txType === TransactionSearchType.EVM_Internal ||
      txType === TransactionSearchType.ERC_20 ||
      txType === TransactionSearchType.ERC_721 ||
      txType === TransactionSearchType.ERC_1155 ||
      txType === TransactionSearchType.TokenTransfer
    )
      sql = `SELECT * FROM tokenTxs WHERE `
  }
  const values: (number | string)[] = []
  let sqlSuffix = ''
  if (afterTimestamp > 0) {
    sql += `timestamp>? `
    sqlSuffix = ` ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${skip}`
    values.push(afterTimestamp)
  }
  if (beforeTimestamp > 0) {
    if (afterTimestamp > 0) sql += `AND timestamp<? `
    else {
      sql += `timestamp<? `
      sqlSuffix = ` ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${skip}`
    }
    values.push(beforeTimestamp)
  }
  try {
    if (address) {
      if (!txType || TransactionSearchType.All) {
        sql += `AND (txFrom=? OR txTo=? OR nominee=?)`
        values.push(address, address, address)
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        sql += `AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType!=?`
        values.push(address, address, address, ty)
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        sql += `AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType=?`
        values.push(address, address, address, ty)
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        sql += `AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=?`
        values.push(address, address, address, ty)
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          sql += `AND contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND NOT (tokenType=?)`
          values.push(address, filterAddress, filterAddress, filterAddress, TransactionType.EVM_Internal)
        } else {
          sql += `AND contractAddress=? AND NOT (tokenType=?)`
          values.push(address, TransactionType.EVM_Internal)
        }
      }
    } else if (txType) {
      if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        sql += `AND transactionType!=?`
        values.push(ty)
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt ||
        txType === TransactionSearchType.InternalTxReceipt
      ) {
        const ty =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : txType === TransactionSearchType.UnstakeReceipt
            ? TransactionType.UnstakeReceipt
            : TransactionType.InternalTxReceipt
        sql += `AND transactionType=?`
        values.push(ty)
      } else if (
        txType === TransactionSearchType.EVM_Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        const ty =
          txType === TransactionSearchType.EVM_Internal
            ? TransactionType.EVM_Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        sql += `AND tokenType=?`
        values.push(ty)
      }
    }
    sql += sqlSuffix
    transactions = await db.all(sql, values)
    if (transactions.length > 0) {
      transactions.forEach((transaction) => {
        if ('transactionType' in transaction && transaction.transactionType)
          deserializeDbTransaction(transaction)
        else if ('tokenType' in transaction && transaction.tokenType) deserializeDbToken(transaction)
      })
    }
  } catch (e) {
    console.log(e)
  }

  if (config.verbose) console.log('transactions by timestamp', transactions)
  return transactions
}

// transactionCount with txType = Receipt, StakeReceipt, UnstakeReceipt
export async function queryTransactionCountByBlock(blockNumber: number, blockHash: string): Promise<number> {
  let transactions: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  let sql = `SELECT COUNT(*) FROM transactions WHERE transactionType IN (?,?,?) AND `
  const values: (number | string)[] = [
    TransactionType.Receipt,
    TransactionType.StakeReceipt,
    TransactionType.UnstakeReceipt,
  ]
  if (blockNumber >= 0) {
    sql += `blockNumber=? `
    values.push(blockNumber)
  } else if (blockHash) {
    sql += `blockHash=? `
    values.push(blockHash)
  }
  try {
    transactions = await db.get(sql, values)
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('transactions count by block', transactions)
  return transactions['COUNT(*)'] || 0
}

// transactions with txType = Receipt, StakeReceipt, UnstakeReceipt
export async function queryTransactionsByBlock(
  blockNumber: number,
  blockHash: string
): Promise<DbTransaction[]> {
  let transactions: DbTransaction[] = []
  let sql = `SELECT * FROM transactions WHERE transactionType IN (?,?,?) AND `
  const values: (number | string)[] = [
    TransactionType.Receipt,
    TransactionType.StakeReceipt,
    TransactionType.UnstakeReceipt,
  ]
  if (blockNumber >= 0) {
    sql += `blockNumber=? `
    values.push(blockNumber)
  } else if (blockHash) {
    sql += `blockHash=? `
    values.push(blockHash)
  }
  sql += `ORDER BY timestamp ASC;`
  try {
    transactions = await db.all(sql, values)
    if (transactions.length > 0) {
      transactions.forEach((transaction) => deserializeDbTransaction(transaction))
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('transactions by block', transactions)
  return transactions
}

export async function queryTokenTxByTxId(txId: string): Promise<DbTokenTx[] | []> {
  try {
    const sql = `SELECT * FROM tokenTxs WHERE txId=?`
    const tokenTxs: DbTokenTx[] = await db.all(sql, [txId])
    if (config.verbose) console.log('tokenTxs txId', tokenTxs)
    return tokenTxs
  } catch (e) {
    console.log(e)
  }
  return []
}

function deserializeDbTransaction(transaction: DbTransaction): void {
  transaction.wrappedEVMAccount = StringUtils.safeJsonParse(transaction.wrappedEVMAccount)
  transaction.originalTxData = StringUtils.safeJsonParse(transaction.originalTxData)
}

function deserializeDbToken(transaction: DbTokenTx): void {
  transaction.contractInfo = StringUtils.safeJsonParse(transaction.contractInfo)
}
