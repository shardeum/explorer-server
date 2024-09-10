import { config } from '../config'
import * as AccountDB from './account'
import * as TransactionDB from './transaction'
import {
  AccountType,
  TokenTx,
  Account,
  Token,
  Transaction,
  TransactionType,
  WrappedAccount,
  WrappedEVMAccount,
  Receipt,
  ContractInfo,
  TokenType,
  InternalTXType,
} from '../types'
import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { decodeTx, getContractInfo, ZERO_ETH_ADDRESS } from '../class/TxDecoder'
import { bytesToHex } from '@ethereumjs/util'
import { forwardReceiptData } from '../logSubscription/CollectorSocketconnection'
import { Utils as StringUtils } from '@shardus/types'

type DbReceipt = Receipt & {
  tx: string
  beforeStates: string
  afterStates: string
  appReceiptData: string | null
  signedReceipt: string
}

export const EOA_CodeHash = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

export const receiptsMap: Map<string, number> = new Map()

export async function insertReceipt(receipt: Receipt): Promise<void> {
  try {
    const fields = Object.keys(receipt).join(', ')
    const placeholders = Object.keys(receipt).fill('?').join(', ')
    const values = extractValues(receipt)
    const sql = 'INSERT OR REPLACE INTO receipts (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Receipt', receipt.receiptId)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert Receipt or it is already stored in to database', receipt.receiptId)
  }
}

export async function bulkInsertReceipts(receipts: Receipt[]): Promise<void> {
  try {
    const fields = Object.keys(receipts[0]).join(', ')
    const placeholders = Object.keys(receipts[0]).fill('?').join(', ')
    const values = extractValuesFromArray(receipts)
    let sql = 'INSERT OR REPLACE INTO receipts (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < receipts.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully bulk inserted receipts', receipts.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert receipts', receipts.length)
  }
}

export async function processReceiptData(receipts: Receipt[], saveOnlyNewData = false): Promise<void> {
  if (receipts && receipts.length <= 0) return
  const bucketSize = 1000
  let combineReceipts: Receipt[] = []
  let combineAccounts1: Account[] = []
  let combineTransactions: Transaction[] = []
  let combineTokenTransactions: TokenTx[] = [] // For TokenType ( EVM_Internal, ERC20, ERC721 )
  let combineTokenTransactions2: TokenTx[] = [] // For TokenType ( ERC1155)
  let combineTokens: Token[] = [] // For Tokens owned by an address
  const contractAccountsIdToDecode = []
  for (const receiptObj of receipts) {
    const { afterStates, cycle, tx, appReceiptData, timestamp } = receiptObj
    if (receiptsMap.has(tx.txId) && receiptsMap.get(tx.txId) === timestamp) {
      continue
    }
    let modifiedReceiptObj = {
      ...receiptObj,
      beforeStates: config.storeReceiptBeforeStates ? receiptObj.beforeStates : [],
    }
    if (saveOnlyNewData) {
      const receiptExist = await queryReceiptByReceiptId(tx.txId)
      if (!receiptExist) combineReceipts.push(modifiedReceiptObj as unknown as Receipt)
    } else combineReceipts.push(modifiedReceiptObj as unknown as Receipt)
    let txReceipt = appReceiptData as WrappedAccount
    receiptsMap.set(tx.txId, tx.timestamp)

    // If the receipt is a challenge, then skip updating its accounts data or transaction data
    // if (
    //   appliedReceipt &&
    //   appliedReceipt.confirmOrChallenge &&
    //   appliedReceipt.confirmOrChallenge.message === 'challenge'
    // )
    //   continue
    // Forward receipt data to LogServer
    await forwardReceiptData([receiptObj])
    // Receipts size can be big, better to save per 100
    if (combineReceipts.length >= 100) {
      await bulkInsertReceipts(combineReceipts)
      combineReceipts = []
    }
    if (!config.indexData.indexReceipt) continue
    const storageKeyValueMap = {}
    for (const account of afterStates) {
      const accountType = account.data.accountType as AccountType
      const accObj = {
        accountId: account.accountId,
        cycle: cycle,
        timestamp: account.timestamp,
        account: account.data,
        hash: account.hash,
        accountType,
        isGlobal: account.isGlobal,
      } as Account
      if (
        accountType === AccountType.Account ||
        accountType === AccountType.ContractStorage ||
        accountType === AccountType.ContractCode
      ) {
        accObj.ethAddress = account.data.ethAddress.toLowerCase()
        if (
          config.indexData.decodeContractInfo &&
          accountType === AccountType.Account &&
          'account' in accObj.account &&
          bytesToHex(Uint8Array.from(Object.values(accObj.account.account.codeHash))) !== EOA_CodeHash
        ) {
          const accountExist = await AccountDB.queryAccountByAccountId(accObj.accountId)
          if (config.verbose) console.log('accountExist', accountExist)
          if (!accountExist) {
            await AccountDB.insertAccount(accObj)
            // Decode contract accounts at the end and update the account
            contractAccountsIdToDecode.push(accObj.accountId)
          } else {
            if (accountExist.timestamp < accObj.timestamp) {
              await AccountDB.updateAccount(accObj.accountId, accObj)
            }
          }
          continue
        }
        if (
          config.indexData.decodeTokenTransfer &&
          accountType === AccountType.ContractStorage &&
          'key' in accObj.account
        ) {
          storageKeyValueMap[accObj.account.key + accObj.ethAddress] = accObj.account
        }
      } else if (
        accountType === AccountType.NetworkAccount ||
        accountType === AccountType.DevAccount ||
        accountType === AccountType.NodeAccount ||
        accountType === AccountType.NodeAccount2
      ) {
        accObj.ethAddress = account.accountId // Adding accountId as ethAddess for these account types for now; since we need ethAddress for mysql index
      }
      const index = combineAccounts1.findIndex((a) => {
        return a.accountId === accObj.accountId
      })
      if (index > -1) {
        // eslint-disable-next-line security/detect-object-injection
        const accountExist = combineAccounts1[index]
        if (accountExist.timestamp < accObj.timestamp) {
          combineAccounts1.splice(index, 1)
          combineAccounts1.push(accObj)
        }
      } else {
        const accountExist = await AccountDB.queryAccountByAccountId(accObj.accountId)
        if (config.verbose) console.log('accountExist', accountExist)
        if (!accountExist) {
          combineAccounts1.push(accObj)
        } else {
          if (accountExist.timestamp < accObj.timestamp) {
            await AccountDB.updateAccount(accObj.accountId, accObj)
          }
        }
      }
      if (
        accountType === AccountType.Receipt ||
        accountType === AccountType.NodeRewardReceipt ||
        accountType === AccountType.StakeReceipt ||
        accountType === AccountType.UnstakeReceipt ||
        accountType === AccountType.InternalTxReceipt
      )
        txReceipt = account
    }
    if (txReceipt) {
      // if (txReceipt.data.accountType !== AccountType.InternalTxReceipt) {
      const transactionType: TransactionType =
        txReceipt.data.accountType === AccountType.Receipt
          ? TransactionType.Receipt
          : txReceipt.data.accountType === AccountType.NodeRewardReceipt
          ? TransactionType.NodeRewardReceipt
          : txReceipt.data.accountType === AccountType.StakeReceipt
          ? TransactionType.StakeReceipt
          : txReceipt.data.accountType === AccountType.UnstakeReceipt
          ? TransactionType.UnstakeReceipt
          : txReceipt.data.accountType === AccountType.InternalTxReceipt
          ? TransactionType.InternalTxReceipt
          : (-1 as TransactionType)

      if (transactionType !== (-1 as TransactionType)) {
        const internalTXType = txReceipt.data.readableReceipt.internalTx
          ? txReceipt.data.readableReceipt.internalTx.internalTXType
          : transactionType === TransactionType.StakeReceipt
          ? InternalTXType.Stake
          : transactionType === TransactionType.UnstakeReceipt
          ? InternalTXType.Unstake
          : null
        const txObj: Transaction = {
          txId: tx.txId,
          cycle: cycle,
          blockNumber: parseInt(txReceipt.data.readableReceipt.blockNumber),
          blockHash: txReceipt.data.readableReceipt.blockHash,
          timestamp: tx.timestamp,
          wrappedEVMAccount: txReceipt.data,
          transactionType,
          txHash: txReceipt.data.ethAddress,
          txFrom: txReceipt.data.readableReceipt.from,
          txTo: txReceipt.data.readableReceipt.to
            ? txReceipt.data.readableReceipt.to
            : txReceipt.data.readableReceipt.contractAddress,
          originalTxData: tx.originalTxData || {},
          internalTXType,
        }
        if (txReceipt.data.readableReceipt.stakeInfo) {
          txObj.nominee = txReceipt.data.readableReceipt.stakeInfo.nominee
        }
        let newTx = true
        const transactionExist = await TransactionDB.queryTransactionByTxId(tx.txId)
        if (config.verbose) console.log('transactionExist', transactionExist)
        if (!transactionExist) {
          if (txObj.nominee) await TransactionDB.insertTransaction(txObj)
          else combineTransactions.push(txObj)
        } else {
          if (transactionExist.timestamp < txObj.timestamp) {
            await TransactionDB.insertTransaction(txObj)
          }
          newTx = false
        }
        const { txs, accs, tokens } = await decodeTx(txObj, storageKeyValueMap, newTx)
        for (const acc of accs) {
          if (acc === ZERO_ETH_ADDRESS) continue
          if (!combineAccounts1.some((a) => a.ethAddress === acc)) {
            const addressToCreate = acc
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
              combineAccounts1.push(accObj)
            }
          }
        }
        for (const tx of txs) {
          let accountExist: Account | null = null
          if (tx.tokenType !== TokenType.EVM_Internal)
            accountExist = await AccountDB.queryAccountByAccountId(
              tx.contractAddress.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
            )
          let contractInfo = {} as ContractInfo
          if (accountExist && accountExist.contractInfo) {
            contractInfo = accountExist.contractInfo
          }
          if ('amountSpent' in txObj.wrappedEVMAccount) {
            const obj: TokenTx = {
              ...tx,
              txId: txObj.txId,
              txHash: txObj.txHash,
              cycle: txObj.cycle,
              timestamp: txObj.timestamp,
              transactionFee: txObj.wrappedEVMAccount.amountSpent, // Maybe provide with actual token transfer cost
              contractInfo,
            }
            if (tx.tokenType === TokenType.ERC_1155) {
              combineTokenTransactions2.push(obj)
            } else {
              combineTokenTransactions.push(obj)
            }
          }
        }
        combineTokens = [...combineTokens, ...tokens]
      }
    }
    if (combineAccounts1.length >= bucketSize) {
      await AccountDB.bulkInsertAccounts(combineAccounts1)
      combineAccounts1 = []
    }
    if (combineTransactions.length >= bucketSize) {
      await TransactionDB.bulkInsertTransactions(combineTransactions)
      combineTransactions = []
    }
    if (combineTokenTransactions.length >= bucketSize) {
      await TransactionDB.bulkInsertTokenTransactions(combineTokenTransactions)
      combineTokenTransactions = []
    }
    if (combineTokenTransactions2.length >= bucketSize) {
      await TransactionDB.bulkInsertTokenTransactions(combineTokenTransactions2)
      combineTokenTransactions2 = []
    }
    if (combineTokens.length >= bucketSize) {
      await AccountDB.bulkInsertTokens(combineTokens)
      combineTokens = []
    }
  }
  if (combineReceipts.length > 0) await bulkInsertReceipts(combineReceipts)
  if (combineAccounts1.length > 0) await AccountDB.bulkInsertAccounts(combineAccounts1)
  if (combineTransactions.length > 0) await TransactionDB.bulkInsertTransactions(combineTransactions)
  if (combineTokenTransactions.length > 0)
    await TransactionDB.bulkInsertTokenTransactions(combineTokenTransactions)
  if (combineTokenTransactions2.length > 0)
    await TransactionDB.bulkInsertTokenTransactions(combineTokenTransactions2)
  if (combineTokens.length > 0) await AccountDB.bulkInsertTokens(combineTokens)
  if (contractAccountsIdToDecode.length > 0) {
    for (const accountId of contractAccountsIdToDecode) {
      const accObj = await AccountDB.queryAccountByAccountId(accountId)
      const { contractInfo, contractType } = await getContractInfo(accObj.ethAddress)
      accObj.contractInfo = contractInfo as ContractInfo
      accObj.contractType = contractType
      await AccountDB.insertAccount(accObj)
    }
  }
}

export async function queryReceiptByReceiptId(receiptId: string): Promise<Receipt | null> {
  try {
    const sql = `SELECT * FROM receipts WHERE receiptId=?`
    const receipt: DbReceipt = await db.get(sql, [receiptId])
    if (receipt) {
      deserializeDbReceipt(receipt)
    }
    if (config.verbose) console.log('Receipt receiptId', receipt)
    return receipt as Receipt
  } catch (e) {
    console.log(e)
  }

  return null
}

export async function queryLatestReceipts(count: number): Promise<Receipt[]> {
  try {
    const sql = `SELECT * FROM receipts ORDER BY cycle DESC, timestamp DESC LIMIT ${count ? count : 100}`
    const receipts: DbReceipt[] = await db.all(sql)
    receipts.forEach((receipt: DbReceipt) => deserializeDbReceipt(receipt))
    if (config.verbose) console.log('Receipt latest', receipts)
    return receipts
  } catch (e) {
    console.log(e)
  }

  return []
}

export async function queryReceipts(skip = 0, limit = 10000): Promise<Receipt[]> {
  let receipts: DbReceipt[] = []
  try {
    const sql = `SELECT * FROM receipts ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
    receipts = await db.all(sql)
    receipts.forEach((receipt: DbReceipt) => deserializeDbReceipt(receipt))
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Receipt receipts', receipts ? receipts.length : receipts, 'skip', skip)

  return receipts
}

export async function queryReceiptCount(): Promise<number> {
  let receipts: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  try {
    const sql = `SELECT COUNT(*) FROM receipts`
    receipts = await db.get(sql, [])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Receipt count', receipts)

  return receipts['COUNT(*)'] || 0
}

export async function queryReceiptCountByCycles(
  start: number,
  end: number
): Promise<{ receipts: number; cycle: number }[]> {
  let receipts: { cycle: number; 'COUNT(*)': number }[] = []
  try {
    const sql = `SELECT cycle, COUNT(*) FROM receipts GROUP BY cycle HAVING cycle BETWEEN ? AND ? ORDER BY cycle ASC`
    receipts = await db.all(sql, [start, end])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Receipt count by cycles', receipts)

  return receipts.map((receipt) => {
    return {
      receipts: receipt['COUNT(*)'],
      cycle: receipt.cycle,
    }
  })
}

export async function queryReceiptsBetweenCycles(
  skip = 0,
  limit = 10,
  start: number,
  end: number
): Promise<Receipt[]> {
  let receipts: DbReceipt[] = []
  try {
    const sql = `SELECT * FROM receipts WHERE cycle BETWEEN ? and ? ORDER BY cycle ASC, timestamp ASC LIMIT ${limit} OFFSET ${skip}`
    receipts = await db.all(sql, [start, end])
    receipts.forEach((receipt: DbReceipt) => deserializeDbReceipt(receipt))
  } catch (e) {
    console.log(e)
  }

  if (config.verbose) console.log('Receipt receipts between cycles', receipts)
  return receipts
}

export async function queryReceiptCountBetweenCycles(start: number, end: number): Promise<number> {
  let receipts: { 'COUNT(*)': number } = { 'COUNT(*)': 0 }
  try {
    const sql = `SELECT COUNT(*) FROM receipts WHERE cycle BETWEEN ? and ?`
    receipts = await db.get(sql, [start, end])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Receipt receipts count between cycles', receipts)

  return receipts['COUNT(*)'] || 0
}

function deserializeDbReceipt(receipt: DbReceipt): void {
  receipt.tx &&= StringUtils.safeJsonParse(receipt.tx)
  receipt.afterStates &&= StringUtils.safeJsonParse(receipt.afterStates)
  receipt.beforeStates &&= StringUtils.safeJsonParse(receipt.beforeStates)
  receipt.signedReceipt &&= StringUtils.safeJsonParse(receipt.signedReceipt)
  receipt.appReceiptData &&= StringUtils.safeJsonParse(receipt.appReceiptData)
}

export function cleanOldReceiptsMap(timestamp: number): void {
  for (const [key, value] of receiptsMap) {
    if (value < timestamp) receiptsMap.delete(key)
  }
  if (config.verbose) console.log('Clean Old Receipts Map', timestamp, receiptsMap)
}
