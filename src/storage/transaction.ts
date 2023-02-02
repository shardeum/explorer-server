import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import {
  AccountType,
  InternalTXType,
  ReadableReceipt,
  TokenTx,
  TransactionType,
  TransactionSearchType,
  WrappedEVMAccount,
} from '../@type'
import ERC20ABI from 'human-standard-token-abi'
import Web3 from 'web3'
import * as Account from './account'
import { decodeTx, ZERO_ETH_ADDRESS } from '../class/TxDecoder'

export const ERC20_METHOD_DIC = {
  '0xa9059cbb': 'transfer',
  '0xa978501e': 'transferFrom',
}

export let Collection: any

export interface Transaction {
  txId: string
  result: any
  cycle: number
  partition: number
  timestamp: number
  wrappedEVMAccount: WrappedEVMAccount
  accountId: string
  transactionType: TransactionType
  txHash: string
  txFrom: string
  txTo: string
  nominee?: string
  originTxData: any
}

export function isTransaction(obj: WrappedEVMAccount): obj is WrappedEVMAccount {
  return (
    (obj as WrappedEVMAccount).accountType === AccountType.Receipt &&
    (obj as WrappedEVMAccount).txId !== undefined
  )
}

export async function insertTransaction(transaction: Transaction) {
  try {
    const fields = Object.keys(transaction).join(', ')
    const placeholders = Object.keys(transaction).fill('?').join(', ')
    const values = extractValues(transaction)
    let sql = 'INSERT OR REPLACE INTO transactions (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Transaction', transaction.txId, transaction.txHash)
  } catch (e) {
    // const transactionExist = await queryTransactionByTxId(transaction.txId);
    // if (transactionExist) {
    //   // console.log(transactionExist, transaction);
    //   if (JSON.stringify(transaction) === JSON.stringify(transactionExist)) {
    //     console.log('same data', 'transaction');
    //     return;
    //   } else {
    //     console.log('not same data');
    //   }
    // }
    console.log(e)
    console.log('Unable to insert Transaction or it is already stored in to database', transaction.txId)
  }
}

export async function bulkInsertTransactions(transactions: Transaction[]) {
  try {
    const fields = Object.keys(transactions[0]).join(', ')
    const placeholders = Object.keys(transactions[0]).fill('?').join(', ')
    const values = extractValuesFromArray(transactions)
    let sql = 'INSERT OR REPLACE INTO transactions (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < transactions.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully inserted transactions', transactions.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert transactions', transactions.length)
  }
}

export async function updateTransaction(txId: string, transaction: Transaction) {
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

export async function insertTokenTransaction(tokenTx: TokenTx) {
  try {
    const fields = Object.keys(tokenTx).join(', ')
    const placeholders = Object.keys(tokenTx).fill('?').join(', ')
    const values = extractValues(tokenTx)
    let sql = 'INSERT OR REPLACE INTO tokenTxs (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Token Transaction', tokenTx.txHash)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert Token Transaction or it is already stored in to database', tokenTx.txHash)
  }
}

export async function bulkInsertTokenTransactions(tokenTxs: TokenTx[]) {
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

export async function processTransactionData(transactions: any) {
  console.log('transactions size', transactions.length)
  if (transactions && transactions.length <= 0) return
  let bucketSize = 1000
  let combineAccounts = []
  let existingAccounts = [] // To save perf on querying from the db again and again, save the existing account that is queried once in memory
  let combineTransactions = []
  let combineTokenTransactions = [] // For TransactionType (Internal ,ERC20, ERC721)
  let combineTokenTransactions2 = [] // For TransactionType (ERC1155)
  let combineTokens = [] // For Tokens owned by an address
  for (let j = 0; j < transactions.length; j++) {
    const transaction = transactions[j]
    const accountType = transaction.data && transaction.data.accountType
    if (
      accountType === AccountType.Receipt ||
      accountType === AccountType.NodeRewardReceipt ||
      accountType === AccountType.StakeReceipt ||
      accountType === AccountType.UnstakeReceipt
    ) {
      const txObj = {
        txId: transaction.data.txId,
        result: ['passed'], // temp placeholder
        cycle: transaction.cycleNumber,
        // partition: Number(partition), // We don't know the partition now
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
            : TransactionType.UnstakeReceipt,
        txHash: transaction.data.ethAddress,
        txFrom: transaction.data.readableReceipt.from,
        txTo: transaction.data.readableReceipt.to
          ? transaction.data.readableReceipt.to
          : transaction.data.readableReceipt.contractAddress,
        originTxData: {},
      } as Transaction

      const { txs, accs, tokens } = await decodeTx(txObj)
      for (let i = 0; i < accs.length; i++) {
        if (accs[i] === ZERO_ETH_ADDRESS) continue
        const index = combineAccounts.findIndex(
          (a) => a.accountId === accs[i].slice(2).toLowerCase() + '0'.repeat(24)
        )
        if (index > -1) {
          let accountExist = combineAccounts[index]
          accountExist.timestamp = txObj.timestamp
          combineAccounts.splice(index, 1)
          combineAccounts.push(accountExist)
        } else {
          const addressToCreate = accs[i]
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
              },
              hash: 'Ox',
              accountType: AccountType.Account,
            }
            combineAccounts.push(accObj)
          } else {
            existingAccounts.push(addressToCreate)
          }
        }
      }
      for (let i = 0; i < txs.length; i++) {
        const accountExist = await Account.queryAccountByAccountId(
          txs[i].contractAddress.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
        )
        let contractInfo = {}
        if (accountExist && accountExist.contractInfo) {
          contractInfo = accountExist.contractInfo
        }
        if (txs[i].tokenType === TransactionType.ERC_1155) {
          combineTokenTransactions2.push({
            txId: txObj.txId,
            txHash: txObj.txHash,
            cycle: txObj.cycle,
            timestamp: txObj.timestamp,
            transactionFee: txObj.wrappedEVMAccount.readableReceipt.gasUsed, // Maybe provide with actual token transfer cost
            contractInfo,
            ...txs[i],
          })
        } else {
          combineTokenTransactions.push({
            txId: txObj.txId,
            txHash: txObj.txHash,
            cycle: txObj.cycle,
            timestamp: txObj.timestamp,
            contractInfo,
            transactionFee: txObj.wrappedEVMAccount.readableReceipt.gasUsed, // Maybe provide with actual token transfer cost
            ...txs[i],
          })
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
    let accountsToSave
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

export async function insertOrUpdateTransaction(archivedCycle: any) {
  const skipTxs: string[] = []
  const transactions: any = []
  if (!archivedCycle.receipt) {
    if (config.verbose) console.log('No Receipt')
    return
  }
  if (!archivedCycle.receipt.partitionMaps) {
    if (config.verbose) console.log('No partitionMaps')
    return
  }
  for (const partition in archivedCycle.receipt.partitionMaps) {
    const receiptsInPartition = archivedCycle.receipt.partitionMaps[partition]

    for (const txId in receiptsInPartition) {
      if (skipTxs.includes(txId)) continue
      if (!archivedCycle.receipt.partitionTxs[partition][txId]) {
        console.log(
          `txId ${txId} is not found in partitionTxs`,
          archivedCycle.receipt.partitionMaps[partition][txId]
        )
        continue
      }
      // console.log('accountList', archivedCycle.receipt.partitionTxs[partition][txId])
      let transactionExist: any = await queryTransactionByTxId(txId)
      if (config.verbose) console.log('transactionExist', transactionExist)
      if (transactionExist) continue
      let transactionData = archivedCycle.receipt.partitionTxs[partition][txId].filter((acc: any) => {
        return (
          acc?.data?.accountType === AccountType.Receipt ||
          acc?.data?.accountType === AccountType.NodeRewardReceipt ||
          acc?.data?.accountType === AccountType.StakeReceipt ||
          acc?.data?.accountType === AccountType.UnstakeReceipt
        )
      })
      let txReceipt
      if (config.verbose) console.log('transactionData', txId, transactionData)
      if (transactionData.length > 0) {
        txReceipt = transactionData[0].data
        if (config.verbose) console.log('txReceipt', txReceipt)
      } else {
        // Other types of tx like init_network, node_reward
        continue // skip other types of tx for now // will open it back after changes are made in client to display it
      }
      const transactionInfo: any = {
        txId,
        result: receiptsInPartition[txId],
        cycle: archivedCycle.cycleRecord.counter,
        partition: Number(partition),
        timestamp: transactionData[0].data.timestamp,
        wrappedEVMAccount: transactionData[0].data,
        accountId: transactionData[0].accountId,
        txHash: txReceipt.ethAddress,
      }
      const { contractAddress, data, from, to } = transactionInfo.wrappedEVMAccount.readableReceipt

      // Contract creation
      if (!to) {
        if (config.verbose) console.log('Token', transactionInfo.wrappedEVMAccount.readableReceipt)
        // var provider = 'http://localhost:8080';
        // var web3Provider = new Web3.providers.HttpProvider(provider);
        // var web3Provider = new Web3(web3Provider);
        let contractInfo = {}
        try {
          const web3: any = await getWeb3()
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
        transactionData = archivedCycle.receipt.partitionTxs[partition][txId].filter((acc: any) => {
          return acc?.data?.accountType === AccountType.Account && acc?.data?.ethAddress === contractAddress
        })
        if (transactionData.length > 0) {
          if (config.verbose) console.log('contract transactionData', txId, transactionData)
          const accountId = transactionData[0].accountId
          const accountExist: any = await Account.queryAccountByAddress(accountId)
          if (config.verbose) console.log('accountExist', accountExist)
          const account = transactionData[0].data
          const accObj: any = {
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
        if (config.verbose) console.log('ERC 20 Token', transactionInfo.wrappedEVMAccount.readableReceipt)
        const methodCode = data.substr(0, 10)
        if (config.verbose) console.log(methodCode)
        if (ERC20_METHOD_DIC[methodCode] === 'transfer' || ERC20_METHOD_DIC[methodCode] === 'transferFrom') {
          const tokenTx = {} as TokenTx
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
          transactionInfo.wrappedEVMAccount.tokenTx = tokenTx
          if (tokenTx.tokenTo) {
            const accountExist = await Account.queryAccountByAddress(tokenTx.tokenTo)
            if (config.verbose) console.log('tokenTx.tokenTo', tokenTx.tokenTo, accountExist)
            if (!accountExist) {
              // Account is not created in the EVM yet
              // Make a sample account with that address to show the account info in the explorer
              const accObj: any = {
                accountId: tokenTx.tokenTo.slice(2).toLowerCase() + '0'.repeat(24),
                cycle: archivedCycle.cycleRecord.counter,
                timestamp: transactionInfo.timestamp,
                ethAddress: tokenTx.tokenTo,
                account: {
                  nonce: '0',
                  balance: '0',
                },
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
          transactionExist.wrappedEVMAccount.timestamp < transactionInfo.wrappedEVMAccount.timestamp
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

export const getWeb3 = function () {
  return new Promise((resolve, reject) => {
    try {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(`http://${config.rpcInfo.ip}:${config.rpcInfo.port}`)
      )
      resolve(web3)
    } catch (e) {
      console.error(e)
      reject('Cannot get web3 instance')
    }
  })
}

export async function queryTransactionCount(
  address = undefined,
  txType = undefined,
  filterAddress = undefined
) {
  let transactions
  try {
    if (address) {
      if (!txType || txType === TransactionSearchType.All) {
        const sql = `SELECT COUNT(*) FROM transactions WHERE txFrom=? OR txTo=? OR nominee=?`
        transactions = await db.get(sql, [address, address, address])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt
      ) {
        txType =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : TransactionType.UnstakeReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE (txFrom=? OR txTo=? OR nominee=?) && transactionType=?`
        transactions = await db.get(sql, [address, address, address, txType])
      } else if (
        txType === TransactionSearchType.Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        txType =
          txType === TransactionSearchType.Internal
            ? TransactionType.Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT COUNT(*) FROM tokenTxs WHERE (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=?`
        transactions = await db.get(sql, [address, address, address, txType])
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          const sql = `SELECT COUNT(*) FROM tokenTxs WHERE contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?)`
          transactions = await db.get(sql, [address, filterAddress, filterAddress, filterAddress])
        } else {
          const sql = `SELECT COUNT(*) FROM tokenTxs WHERE contractAddress=?`
          transactions = await db.get(sql, [address])
        }
      }
    } else if (txType || txType === TransactionSearchType.All) {
      if (txType === TransactionSearchType.All) {
        const sql = `SELECT COUNT(*) FROM transactions`
        transactions = await db.get(sql, [])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt
      ) {
        txType =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : TransactionType.UnstakeReceipt
        const sql = `SELECT COUNT(*) FROM transactions WHERE transactionType=?`
        transactions = await db.get(sql, [txType])
      } else if (
        txType === TransactionSearchType.Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        txType =
          txType === TransactionSearchType.Internal
            ? TransactionType.Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT COUNT(*) FROM tokenTxs WHERE tokenType=?`
        transactions = await db.get(sql, [txType])
      }
    } else {
      const sql = `SELECT COUNT(*) FROM transactions`
      transactions = await db.get(sql)
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('transactions', transactions)
  if (transactions) transactions = transactions['COUNT(*)']
  else transactions = 0
  return transactions
}

export async function queryTransactions(
  skip = 0,
  limit = 10,
  address = undefined,
  txType = undefined,
  filterAddress = undefined
) {
  let transactions
  try {
    if (address) {
      if (!txType || TransactionSearchType.All) {
        const sql = `SELECT * FROM transactions WHERE txFrom=? OR txTo=? OR nominee=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [address, address, address])
      } else if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt
      ) {
        txType =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : TransactionType.UnstakeReceipt
        const sql = `SELECT * FROM transactions WHERE (txFrom=? OR txTo=? OR nominee=?) AND transactionType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [address, address, address, txType])
      } else if (
        txType === TransactionSearchType.Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        txType =
          txType === TransactionSearchType.Internal
            ? TransactionType.Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT * FROM tokenTxs WHERE (tokenFrom=? OR tokenTo=? OR tokenOperator=?) AND tokenType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [address, address, address, txType])
      } else if (txType === TransactionSearchType.TokenTransfer) {
        if (filterAddress) {
          const sql = `SELECT * FROM tokenTxs WHERE contractAddress=? AND (tokenFrom=? OR tokenTo=? OR tokenOperator=?) ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [address, filterAddress, filterAddress, filterAddress])
        } else {
          const sql = `SELECT * FROM tokenTxs WHERE contractAddress=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
          transactions = await db.all(sql, [address])
        }
      }
    } else if (txType) {
      if (
        txType === TransactionSearchType.Receipt ||
        txType === TransactionSearchType.NodeRewardReceipt ||
        txType === TransactionSearchType.StakeReceipt ||
        txType === TransactionSearchType.UnstakeReceipt
      ) {
        txType =
          txType === TransactionSearchType.Receipt
            ? TransactionType.Receipt
            : txType === TransactionSearchType.NodeRewardReceipt
            ? TransactionType.NodeRewardReceipt
            : txType === TransactionSearchType.StakeReceipt
            ? TransactionType.StakeReceipt
            : TransactionType.UnstakeReceipt
        const sql = `SELECT * FROM transactions WHERE transactionType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [txType])
      } else if (
        txType === TransactionSearchType.Internal ||
        txType === TransactionSearchType.ERC_20 ||
        txType === TransactionSearchType.ERC_721 ||
        txType === TransactionSearchType.ERC_1155
      ) {
        txType =
          txType === TransactionSearchType.Internal
            ? TransactionType.Internal
            : txType === TransactionSearchType.ERC_20
            ? TransactionType.ERC_20
            : txType === TransactionSearchType.ERC_721
            ? TransactionType.ERC_721
            : TransactionType.ERC_1155
        const sql = `SELECT * FROM tokenTxs WHERE tokenType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        transactions = await db.all(sql, [txType])
      }
    } else {
      const sql = `SELECT * FROM transactions ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
      transactions = await db.all(sql)
    }
    if (transactions.length > 0) {
      transactions.map((transaction: any) => {
        if (transaction.wrappedEVMAccount)
          transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
        if (transaction.result) transaction.result = JSON.parse(transaction.result)
        if (transaction.contractInfo) transaction.contractInfo = JSON.parse(transaction.contractInfo)
        return transaction
      })
    }
    if (config.verbose) console.log('transactions', transactions)
  } catch (e) {
    console.log(e)
  }
  return transactions
}

export async function queryTransactionByTxId(txId: string, detail = false) {
  try {
    const sql = `SELECT * FROM transactions WHERE txId=?`
    const transaction: any = await db.get(sql, [txId])
    if (transaction) {
      if (transaction.wrappedEVMAccount)
        transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
      if (transaction.result) transaction.result = JSON.parse(transaction.result)
    }
    if (detail) {
      const sql = `SELECT * FROM tokenTxs WHERE txId=?`
      const tokenTx: any = await db.all(sql, [txId])
      if (tokenTx.length > 0) {
        transaction.tokenTx = tokenTx
      }
    }
    if (config.verbose) console.log('transaction txId', transaction)
    return transaction
  } catch (e) {
    console.log(e)
  }
}

export async function queryTransactionByHash(txHash: string, detail = false) {
  try {
    const sql = `SELECT * FROM transactions WHERE txHash=? ORDER BY cycle DESC, timestamp DESC`
    const transaction: any = await db.get(sql, [txHash])
    if (transaction) {
      if (transaction.wrappedEVMAccount)
        transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
      if (transaction.result) transaction.result = JSON.parse(transaction.result)
      if (detail) {
        const sql = `SELECT * FROM tokenTxs WHERE txHash=? ORDER BY cycle DESC, timestamp DESC`
        const tokenTxs: any = await db.all(sql, [txHash])
        if (tokenTxs.length > 0) {
          tokenTxs.forEach((tokenTx) => {
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
}

export async function queryTransactionsBetweenCycles(skip = 0, limit = 10, start, end, address = undefined) {
  let transactions
  try {
    if (address) {
      const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=?) ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
      transactions = await db.all(sql, [start, end, address, address])
    } else {
      const sql = `SELECT * FROM transactions WHERE cycle BETWEEN ? and ? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
      transactions = await db.all(sql, [start, end])
    }
    if (transactions.length > 0) {
      transactions.map((transaction: any) => {
        if (transaction.wrappedEVMAccount)
          transaction.wrappedEVMAccount = JSON.parse(transaction.wrappedEVMAccount)
        if (transaction.result) transaction.result = JSON.parse(transaction.result)
        return transaction
      })
    }
  } catch (e) {
    console.log(e)
  }

  if (config.verbose) console.log('transactions', transactions)
  return transactions
}

export async function queryTransactionCountBetweenCycles(
  start,
  end,
  address = undefined,
  txType = undefined
) {
  let transactions
  try {
    if (address) {
      const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND (txFrom=? OR txTo=?)`
      transactions = await db.get(sql, [start, end, address, address])
    } else if (txType === AccountType.NodeRewardReceipt) {
      const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ? AND transactionType=?`
      transactions = await db.get(sql, [start, end, txType])
    } else {
      const sql = `SELECT COUNT(*) FROM transactions WHERE cycle BETWEEN ? and ?`
      transactions = await db.get(sql, [start, end])
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('transactions', transactions)
  if (transactions) transactions = transactions['COUNT(*)']
  else transactions = 0
  return transactions
}
