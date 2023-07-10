import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import {
  AccountType,
  Transaction,
  TokenTx,
  TransactionType,
  TransactionSearchType,
  WrappedEVMAccount,
  WrappedDataReceipt,
  WrappedAccount,
} from '../types'
import ERC20ABI from 'human-standard-token-abi'
import Web3 from 'web3'
import * as Account from './account'
import { decodeTx, ZERO_ETH_ADDRESS } from '../class/TxDecoder'
import { ArchivedCycle } from './archivedCycle'

export { type Transaction } from '../types'

export const ERC20_METHOD_DIC = {
  '0xa9059cbb': 'transfer',
  '0xa978501e': 'transferFrom',
}

export let Collection: unknown

type DbTransaction = Transaction & {
  wrappedEVMAccount: string
  contractInfo: string
  result: string
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
    const sql = `UPDATE transactions SET result = $result, cycle = $cycle, wrappedEVMAccount = $wrappedEVMAccount, accountId = $accountId, txHash = $txHash WHERE txId = $txId `
    await db.run(sql, {
      $result: transaction.result,
      $cycle: transaction.cycle,
      // $partition: transaction.partition,
      $wrappedEVMAccount: transaction.wrappedEVMAccount && JSON.stringify(transaction.wrappedEVMAccount),
      $accountId: transaction.accountId,
      $txHash: transaction.txHash,
      $txId: transaction.txId,
    })
    if (config.verbose) console.log('Successfully Updated Transaction', transaction.txId, transaction.txHash)
  } catch (e) {
    // console.log(e);
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

export async function bulkInsertTokenTransactions<C>(tokenTxs: TokenTx<C>[]): Promise<void> {
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
  originTxData: {
    duration: number
    internalTXType: TransactionType
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
  const combineAccounts: Account.Account[] = []
  const existingAccounts: string[] = [] // To save perf on querying from the db again and again, save the existing account that is queried once in memory
  let combineTransactions: Transaction[] = []
  let combineTokenTransactions: TokenTx<Record<string, never>>[] = [] // For TransactionType (Internal ,ERC20, ERC721)
  let combineTokenTransactions2: TokenTx<Record<string, never>>[] = [] // For TransactionType (ERC1155)
  let combineTokens: Account.Token[] = [] // For Tokens owned by an address
  for (const transaction of transactions) {
    if (isReceiptData(transaction.data)) {
      const txObj: Transaction = {
        txId: transaction.data?.txId,
        result: { txIdShort: '', txResult: '' }, // temp placeholder
        cycle: transaction.cycleNumber,
        partition: 0, // Setting to 0
        timestamp: transaction.timestamp,
        wrappedEVMAccount: transaction.data,
        accountId: transaction.accountId,
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
        originTxData: {},
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
          const accountExist = await Account.queryAccountByAccountId(
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
            }
            combineAccounts.push(accObj)
          } else {
            existingAccounts.push(addressToCreate)
          }
        }
      }
      for (const tx of txs) {
        const accountExist = await Account.queryAccountByAccountId(
          tx.contractAddress.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
        )
        let contractInfo = {}
        if (accountExist && accountExist.contractInfo) {
          contractInfo = accountExist.contractInfo
        }
        // wrapped data must be a receipt here. this type guard ensures that
        if ('readableReceipt' in txObj.wrappedEVMAccount) {
          const obj = {
            ...tx,
            txId: txObj.txId,
            txHash: txObj.txHash,
            cycle: txObj.cycle,
            timestamp: txObj.timestamp,
            transactionFee: txObj.wrappedEVMAccount.readableReceipt.gasUsed ?? '0', // Maybe provide with actual token transfer cost
            contractInfo,
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
      await Account.bulkInsertTokens(combineTokens)
      combineTokens = []
    }
  }
  if (combineAccounts.length > 0) {
    let limit = bucketSize
    let j = limit
    let accountsToSave: Account.Account[]
    for (let i = 0; i < combineAccounts.length; i = j) {
      accountsToSave = combineAccounts.slice(i, limit)
      await Account.bulkInsertAccounts(accountsToSave)
      j = limit
      limit += bucketSize
    }
  }
  if (combineTransactions.length > 0) await bulkInsertTransactions(combineTransactions)
  if (combineTokenTransactions.length > 0) await bulkInsertTokenTransactions(combineTokenTransactions)
  if (combineTokenTransactions2.length > 0) await bulkInsertTokenTransactions(combineTokenTransactions2)
  if (combineTokens.length > 0) await Account.bulkInsertTokens(combineTokens)
}

export async function insertOrUpdateTransaction(archivedCycle: ArchivedCycle): Promise<void> {
  const skipTxs: string[] = []
  if (!archivedCycle.receipt) {
    if (config.verbose) console.log('No Receipt')
    return
  }
  if (!archivedCycle.receipt.partitionMaps) {
    if (config.verbose) console.log('No partitionMaps')
    return
  }
  for (const [partitionStr, receiptsInPartition] of Object.entries(archivedCycle.receipt.partitionMaps)) {
    const partition = Number(partitionStr)
    for (const txId in receiptsInPartition) {
      if (skipTxs.includes(txId)) continue

      // eslint-disable-next-line security/detect-object-injection
      const partitionTx = archivedCycle?.receipt?.partitionTxs?.[partition][txId]
      if (!partitionTx) {
        console.log(`txId ${txId} is not found in partitionTxs`, partitionTx)
        continue
      }
      // console.log('accountList', archivedCycle.receipt.partitionTxs[partition][txId])
      let transactionExist = await queryTransactionByTxId(txId)
      if (config.verbose) console.log('transactionExist', transactionExist)
      if (transactionExist) continue
      let transactionData = partitionTx.filter((acc: WrappedAccount) => {
        return (
          acc?.data?.accountType === AccountType.Receipt ||
          acc?.data?.accountType === AccountType.NodeRewardReceipt ||
          acc?.data?.accountType === AccountType.StakeReceipt ||
          acc?.data?.accountType === AccountType.UnstakeReceipt
        )
      })
      let txReceipt: { ethAddress: string }
      if (config.verbose) console.log('transactionData', txId, transactionData)
      if (transactionData.length > 0) {
        txReceipt = transactionData[0].data
        if (config.verbose) console.log('txReceipt', txReceipt)
      } else {
        // Other types of tx like init_network, node_reward
        continue // skip other types of tx for now // will open it back after changes are made in client to display it
      }
      const transactionInfo: Transaction = {
        txId,
        // eslint-disable-next-line security/detect-object-injection
        result: receiptsInPartition[txId],
        cycle: archivedCycle.cycleRecord.counter,
        partition: Number(partition),
        timestamp: transactionData[0].data.timestamp,
        wrappedEVMAccount: transactionData[0].data,
        accountId: transactionData[0].accountId,
        txHash: txReceipt.ethAddress,

        transactionType: TransactionType.Receipt,
        txFrom: '',
        txTo: '',
        originTxData: {},
        data: {},
      }
      let contractAddress, data, from, to
      if ('readableReceipt' in transactionInfo.wrappedEVMAccount) {
        contractAddress = transactionInfo.wrappedEVMAccount.readableReceipt.contractAddress
        data = transactionInfo.wrappedEVMAccount.readableReceipt.data
        from = transactionInfo.wrappedEVMAccount.readableReceipt.from
        to = transactionInfo.wrappedEVMAccount.readableReceipt.to
      }

      // Contract creation
      if (!to) {
        if (config.verbose) console.log('Token', transactionInfo.wrappedEVMAccount['readableReceipt'])
        // var provider = 'http://localhost:8080';
        // var web3Provider = new Web3.providers.HttpProvider(provider);
        // var web3Provider = new Web3(web3Provider);
        let contractInfo = {}
        try {
          const web3 = await getWeb3()
          const Token = new web3.eth.Contract(ERC20ABI, contractAddress)
          if (config.verbose) console.log('Token', await Token.methods.name().call())
          const name = await Token.methods.name().call()
          const decimals = await Token.methods.decimals().call()
          const symbol = await Token.methods.symbol().call()
          const totalSupply = await Token.methods.totalSupply().call()
          contractInfo = {
            name,
            decimals,
            symbol,
            totalSupply,
          }
        } catch (e) {
          // console.log(contractAddress, transactionInfo);
          // console.log(e);
          console.log('Non ERC 20 Contract', transactionInfo.txHash) // It could be not ERC 20 Contract
        }
        // transactionInfo.wrappedEVMAccount.contractInfo = contractInfo
        // Contract Account
        // eslint-disable-next-line security/detect-object-injection
        transactionData = archivedCycle?.receipt?.partitionTxs?.[partition][txId].filter(
          (acc: WrappedAccount) => {
            return acc?.data?.accountType === AccountType.Account && acc?.data?.ethAddress === contractAddress
          }
        )
        if (transactionData.length > 0) {
          if (config.verbose) console.log('contract transactionData', txId, transactionData)
          const accountId = transactionData[0].accountId
          const accountExist = await Account.queryAccountByAddress(accountId)
          if (config.verbose) console.log('accountExist', accountExist)
          const account = transactionData[0].data
          const accObj: Account.Account = {
            accountId: accountId,
            cycle: archivedCycle.cycleRecord.counter,
            timestamp: account.timestamp,
            ethAddress: account.ethAddress,
            account: account.account,
            hash: account.stateId,
            accountType: AccountType.Account,
            contractInfo,
          }
          if (!accountExist) {
            await Account.insertAccount(accObj)
          } else {
            if (accountExist.cycle < accObj.cycle && accountExist.timestamp < accObj.timestamp) {
              await Account.updateAccount(accountId, accObj)
            }
          }
        }
      }
      // Token Tx
      if (config.verbose) console.log('ERC20', contractAddress, data.length, from)
      if (contractAddress === null && data.length > 2) {
        if (config.verbose) console.log('ERC 20 Token', transactionInfo.wrappedEVMAccount['readableReceipt'])
        const methodCode = data.substring(0, 10) as keyof typeof ERC20_METHOD_DIC
        if (config.verbose) console.log(methodCode)
        // eslint-disable-next-line security/detect-object-injection
        if (ERC20_METHOD_DIC[methodCode] === 'transfer' || ERC20_METHOD_DIC[methodCode] === 'transferFrom') {
          const tokenTx = {} as any
          // eslint-disable-next-line security/detect-object-injection
          if (ERC20_METHOD_DIC[methodCode] === 'transfer') {
            // Token transfer transaction
            tokenTx.tokenFrom = from
            tokenTx.tokenTo = `0x${data.substring(34, 74)}`
            tokenTx.tokenValue = `0x${data.substring(74)}`
          } else {
            // Token transferFRom transaction
            tokenTx.tokenFrom = `0x${data.substring(34, 74)}`
            tokenTx.tokenTo = `0x${data.substring(74, 114)}`
            tokenTx.tokenValue = `0x${data.substring(114)}`
          }
          if (config.verbose) console.log('tokenTx', tokenTx)
          transactionInfo['tokenTxs'] = tokenTx
          if (tokenTx.tokenTo) {
            const accountExist = await Account.queryAccountByAddress(tokenTx.tokenTo)
            if (config.verbose) console.log('tokenTx.tokenTo', tokenTx.tokenTo, accountExist)
            if (!accountExist) {
              // Account is not created in the EVM yet
              // Make a sample account with that address to show the account info in the explorer
              const accObj: Account.Account = {
                accountId: tokenTx.tokenTo.slice(2).toLowerCase() + '0'.repeat(24),
                cycle: archivedCycle.cycleRecord.counter,
                timestamp: transactionInfo.timestamp,
                ethAddress: tokenTx.tokenTo,
                account: {
                  nonce: '0',
                  balance: '0',
                } as WrappedEVMAccount,
                accountType: AccountType.Account,
                hash: 'Ox',
              }
              await Account.insertAccount(accObj)
            }
          }
        }
      }
      transactionExist = await queryTransactionByTxId(txId)
      if (config.verbose) console.log('transactionExist', transactionExist)
      if (!transactionExist) {
        await insertTransaction(transactionInfo)
      } else {
        if (
          transactionExist.cycle < transactionInfo.cycle &&
          (transactionExist.wrappedEVMAccount.timestamp || 0) < transactionInfo.wrappedEVMAccount.timestamp
        ) {
          await updateTransaction(txId, transactionInfo)
        }
      }
      if (!skipTxs.includes(txId)) {
        skipTxs.push(txId)
      }
    }
  }
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
  txType?: TransactionType | TransactionSearchType,
  filterAddress?: string
): Promise<number> {
  let transactions: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  try {
    if (address) {
      if (!txType) {
        // (!txType || txType === TransactionSearchType.All)
        const sql = `SELECT COUNT(*) FROM transactions WHERE txFrom=? OR txTo=? OR nominee=?`
        transactions = await db.get(sql, [address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const sql = `SELECT COUNT(*) FROM transactions WHERE (transactionType=? OR transactionType=? OR transactionType=?) AND (txFrom=? OR txTo=? OR nominee=?)`
        transactions = await db.get(sql, [
          TransactionType.Receipt,
          TransactionType.StakeReceipt,
          TransactionType.UnstakeReceipt,
          address,
          address,
          address,
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
        const sql = `SELECT COUNT(*) FROM transactions WHERE transactionType=? AND (txFrom=? OR txTo=? OR nominee=?)`
        transactions = await db.get(sql, [ty, address, address, address])
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
        const sql = `SELECT COUNT(*) FROM transactions WHERE transactionType=? OR transactionType=? OR transactionType=?`
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
  filterAddress?: string
): Promise<(DbTransaction | DbTokenTx)[]> {
  let transactions: (DbTransaction | DbTokenTx)[] = []
  try {
    if (address) {
      if (!txType || TransactionSearchType.All) {
        const sql = `SELECT * FROM transactions WHERE txFrom=? OR txTo=? OR nominee=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const sql = `SELECT * FROM transactions WHERE (transactionType=? OR transactionType=? OR transactionType=?) AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [
          TransactionType.Receipt,
          TransactionType.StakeReceipt,
          TransactionType.UnstakeReceipt,
          address,
          address,
          address,
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
        const sql = `SELECT * FROM transactions WHERE transactionType=? AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [ty, address, address, address])
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
      // txType should be non-zero as TransactionSearchType starts at 1, so
      // this conditional is pretty sane
      if (txType === TransactionSearchType.AllExceptInternalTx) {
        const sql = `SELECT * FROM transactions WHERE transactionType=? OR  transactionType=? OR  transactionType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [
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
        const sql = `SELECT * FROM transactions WHERE transactionType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [ty])
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
      if ('wrappedEVMAccount' in transaction && transaction.wrappedEVMAccount)
        (transaction as Transaction).wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
      if ('result' in transaction && transaction.result)
        (transaction as Transaction).result = JSON.parse(transaction.result)
      if ('contractInfo' in transaction && transaction.contractInfo)
        (transaction as TokenTx).contractInfo = JSON.parse(transaction.contractInfo)
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
        transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
      if (transaction.result) (transaction as Transaction).result = JSON.parse(transaction.result)
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

export async function queryTransactionByHash(txHash: string, detail = false): Promise<Transaction | null> {
  try {
    const sql = `SELECT * FROM transactions WHERE txHash=? ORDER BY cycle DESC, timestamp DESC`
    const transaction: DbTransaction = await db.get(sql, [txHash])
    if (transaction) {
      if (transaction.wrappedEVMAccount)
        transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
      if (transaction.result) (transaction as Transaction).result = JSON.parse(transaction.result)
      if (detail) {
        const sql = `SELECT * FROM tokenTxs WHERE txHash=? ORDER BY cycle DESC, timestamp DESC`
        const tokenTxs: DbTokenTx[] = await db.all(sql, [txHash])
        if (tokenTxs.length > 0) {
          tokenTxs.forEach((tokenTx: { contractInfo: string }) => {
            if (tokenTx.contractInfo) tokenTx.contractInfo = JSON.parse(tokenTx.contractInfo)
          })
          transaction.tokenTxs = tokenTxs
        }
      }
    }
    if (config.verbose) console.log('transaction hash', transaction)
    return transaction
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
      transactions.forEach((transaction: DbTransaction) => {
        if (transaction.wrappedEVMAccount)
          transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
        if (transaction.result) (transaction as Transaction).result = JSON.parse(transaction.result)
        if (transaction.contractInfo)
          (transaction as Transaction).contractInfo = JSON.parse(transaction.contractInfo)
        return transaction as Transaction
      })
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
      // const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
      // transactions = await db.all(sql, [start, end, address, address])
      if (!txType || TransactionSearchType.All) {
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType!=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, address, address, address, ty])
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
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, address, address, address, ty])
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
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType!=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, ty])
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
        const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType=? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [start, end, ty])
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
      transactions.forEach((transaction) => {
        if ('wrappedEVMAccount' in transaction && transaction.wrappedEVMAccount)
          transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
        if ('result' in transaction && transaction.result)
          (transaction as Transaction).result = JSON.parse(transaction.result)
        if ('contractInfo' in transaction && transaction.contractInfo)
          transaction.contractInfo = JSON.parse(transaction.contractInfo)
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
        // (!txType || txType === TransactionSearchType.All)
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?)`
        transactions = await db.get(sql, [start, end, address, address, address])
      } else if (txType === TransactionSearchType.AllExceptInternalTx) {
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType!=?`
        transactions = await db.get(sql, [start, end, address, address, address, ty])
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
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=? OR nominee=?) AND transactionType=?`
        transactions = await db.get(sql, [start, end, address, address, address, ty])
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
        const ty = TransactionType.InternalTxReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType!=?`
        transactions = await db.get(sql, [start, end, ty])
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
        const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType=?`
        transactions = await db.get(sql, [start, end, ty])
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
      const sql = `SELECT cycle, COUNT(*) FROM transactions WHERE transactionType=? GROUP BY cycle HAVING cycle BETWEEN ? AND ? ORDER BY cycle ASC`
      transactions = await db.all(sql, [ty, start, end])
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
