import { config } from '../config'
import * as Account from './account'
import * as Transaction from './transaction'
import { AccountType, TokenTx, TransactionType, WrappedAccount, WrappedEVMAccount, Receipt } from '../types'
import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { decodeTx, getContractInfo, ZERO_ETH_ADDRESS } from '../class/TxDecoder'
import { bufferToHex } from 'ethereumjs-util'

type DbReceipt = Receipt & {
  tx: string
  beforeStateAccounts: string
  accounts: string
  result: string
  sign: string
}

export const EOA_CodeHash = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

export let receiptsMap: Map<string, number> = new Map()
export let newestReceiptsMap: Map<string, number> = new Map()
export let lastReceiptMapResetTimestamp = 0
export let newestReceiptsMapIsReset = false
export const cleanReceiptsMapByCycle = true

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

export async function processReceiptData(
  receipts: {
    accounts: WrappedAccount[]
    cycle: number
    result: unknown
    tx: Transaction.Transaction
    receipt: WrappedAccount
  }[]
): Promise<void> {
  if (receipts && receipts.length <= 0) return
  if (!cleanReceiptsMapByCycle) {
    const currentTime = Date.now()
    if (currentTime - lastReceiptMapResetTimestamp >= 60000 && !newestReceiptsMapIsReset) {
      newestReceiptsMap = new Map() // To save 30s data; So even when receiptMap is reset, this still has the record and will skip saving if it finds one
      newestReceiptsMapIsReset = true
      if (config.verbose) console.log('Newest Receipts Map Reset!', newestReceiptsMap)
    }
  }
  const bucketSize = 1000
  let combineReceipts: Receipt[] = []
  let combineAccounts1: Account.Account[] = [] // For AccountType (Account(EOA), ContractStorage, ContractCode)
  let combineAccounts2: Account.Account[] = [] // For AccountType (NetworkAccount, NodeAccount)
  let combineTransactions: Transaction.Transaction[] = []
  let combineTokenTransactions: TokenTx<object>[] = [] // For TransactionType (Internal ,ERC20, ERC721)
  let combineTokenTransactions2: TokenTx<object>[] = [] // For TransactionType (ERC1155)
  let combineTokens: Account.Token[] = [] // For Tokens owned by an address
  for (const receiptObj of receipts) {
    const { accounts, cycle, result, tx, receipt } = receiptObj
    if (receiptsMap.has(tx.txId) || newestReceiptsMap.has(tx.txId)) {
      continue
    }
    const receiptExist = await queryReceiptByReceiptId(tx.txId)
    let txReceipt: WrappedAccount = receipt
    if (!receiptExist) combineReceipts.push(receiptObj as unknown as Receipt)
    receiptsMap.set(tx.txId, cycle)
    if (!cleanReceiptsMapByCycle) newestReceiptsMap.set(tx.txId, cycle)
    const storageKeyValueMap = {}
    for (const account of accounts) {
      const accountType = account.data.accountType
      let accObj: Account.Account
      if (
        accountType === AccountType.Account ||
        accountType === AccountType.ContractStorage ||
        accountType === AccountType.ContractCode
      ) {
        accObj = {
          accountId: account.accountId,
          cycle: cycle,
          timestamp: account.timestamp,
          ethAddress: account.data.ethAddress.toLowerCase(),
          account: accountType === AccountType.Account ? account.data.account : account.data,
          hash: account.stateId,
          accountType: account.data.accountType,
        }
        if (
          accountType === AccountType.Account &&
          'codeHash' in accObj.account &&
          bufferToHex(accObj.account.codeHash.data) !== EOA_CodeHash
        ) {
          const accountExist = await Account.queryAccountByAccountId(accObj.accountId)
          if (config.verbose) console.log('accountExist', accountExist)
          if (!accountExist) {
            const { contractInfo, contractType } = await getContractInfo(accObj.ethAddress)
            accObj.contractInfo = contractInfo
            accObj.contractType = contractType
            await Account.insertAccount(accObj)
          } else {
            if (accountExist.cycle <= accObj.cycle && accountExist.timestamp < accObj.timestamp) {
              await Account.updateAccount(accObj.accountId, accObj)
            }
          }
          continue
        }
        const index = combineAccounts1.findIndex((a) => {
          return a.accountId === accObj.accountId
        })
        if (index > -1) {
          // index comes from an index found in the array
          // eslint-disable-next-line security/detect-object-injection
          const accountExist = combineAccounts1[index]
          if (accountExist.cycle < accObj.cycle && accountExist.timestamp < accObj.timestamp) {
            combineAccounts1.splice(index, 1)
            combineAccounts1.push(accObj)
          }
        } else {
          const accountExist = await Account.queryAccountByAccountId(accObj.accountId)
          if (config.verbose) console.log('accountExist', accountExist)
          if (!accountExist) {
            combineAccounts1.push(accObj)
          } else {
            if (accountExist.cycle <= accObj.cycle && accountExist.timestamp < accObj.timestamp) {
              await Account.updateAccount(accObj.accountId, accObj)
            }
          }
        }
        if (accountType === AccountType.ContractStorage && 'key' in accObj.account) {
          storageKeyValueMap[accObj.account.key + accObj.ethAddress] = accObj.account
        }
      } else if (
        accountType === AccountType.NetworkAccount ||
        accountType === AccountType.NodeAccount ||
        accountType === AccountType.NodeAccount2
      ) {
        accObj = {
          accountId: account.accountId,
          cycle: cycle,
          timestamp: account.timestamp,
          ethAddress: account.accountId, // Adding accountId as ethAddess for these account types for now; since we need ethAddress for mysql index
          account: account.data,
          hash: account.stateId,
          accountType: account.data.accountType,
        }
        const index = combineAccounts2.findIndex((a) => a.accountId === accObj.accountId)
        if (index > -1) {
          // index comes from an index found in the array
          // eslint-disable-next-line security/detect-object-injection
          const accountExist = combineAccounts2[index]
          if (accountExist.cycle <= accObj.cycle && accountExist.timestamp < accObj.timestamp) {
            combineAccounts2.splice(index, 1)
            combineAccounts2.push(accObj)
          }
        } else {
          const accountExist = await Account.queryAccountByAccountId(accObj.accountId)
          if (config.verbose) console.log('accountExist', accountExist)
          if (!accountExist) {
            combineAccounts2.push(accObj)
          } else {
            if (accountExist.cycle <= accObj.cycle && accountExist.timestamp < accObj.timestamp) {
              await Account.updateAccount(accObj.accountId, accObj)
            }
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
        const txObj = {
          txId: tx.txId,
          result,
          cycle: cycle,
          // partition: Number(partition), // We don't know the partition now
          timestamp: tx.timestamp,
          wrappedEVMAccount: txReceipt.data,
          accountId: txReceipt.accountId,
          transactionType,
          txHash: txReceipt.data.ethAddress,
          txFrom: txReceipt.data.readableReceipt.from,
          txTo: txReceipt.data.readableReceipt.to
            ? txReceipt.data.readableReceipt.to
            : txReceipt.data.readableReceipt.contractAddress,
          originTxData: tx.originTxData || {},
        } as Transaction.Transaction
        if (txReceipt.data.readableReceipt.stakeInfo) {
          txObj.nominee = txReceipt.data.readableReceipt.stakeInfo.nominee
        }
        let newTx = true
        const transactionExist = await Transaction.queryTransactionByTxId(tx.txId)
        if (config.verbose) console.log('transactionExist', transactionExist)
        if (!transactionExist) {
          if (txObj.nominee) await Transaction.insertTransaction(txObj)
          else combineTransactions.push(txObj)
        } else {
          if (transactionExist.cycle <= txObj.cycle && transactionExist.timestamp < txObj.timestamp) {
            await Transaction.insertTransaction(tx)
          }
          newTx = false
        }
        const { txs, accs, tokens } = await decodeTx(txObj, storageKeyValueMap, newTx)
        for (const acc of accs) {
          if (acc === ZERO_ETH_ADDRESS) continue
          if (!combineAccounts1.some((a) => a.ethAddress === acc)) {
            const addressToCreate = acc
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
              combineAccounts1.push(accObj)
            }
          }
        }
        for (const tx of txs) {
          let accountExist: Account.Account | null = null
          if (tx.tokenType !== TransactionType.EVM_Internal)
            accountExist = await Account.queryAccountByAccountId(
              tx.contractAddress.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
            )
          let contractInfo = {}
          if (accountExist && accountExist.contractInfo) {
            contractInfo = accountExist.contractInfo
          }
          if ('amountSpent' in txObj.wrappedEVMAccount) {
            const obj = {
              ...tx,
              txId: txObj.txId,
              txHash: txObj.txHash,
              cycle: txObj.cycle,
              timestamp: txObj.timestamp,
              transactionFee: txObj.wrappedEVMAccount.amountSpent, // Maybe provide with actual token transfer cost
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
      }
    }
    // Receipts size can be big, better to save per 100
    if (combineReceipts.length >= 100) {
      await bulkInsertReceipts(combineReceipts)
      combineReceipts = []
    }
    if (combineAccounts1.length >= bucketSize) {
      await Account.bulkInsertAccounts(combineAccounts1)
      combineAccounts1 = []
    }
    if (combineAccounts2.length >= bucketSize) {
      await Account.bulkInsertAccounts(combineAccounts2)
      combineAccounts2 = []
    }
    if (combineTransactions.length >= bucketSize) {
      await Transaction.bulkInsertTransactions(combineTransactions)
      combineTransactions = []
    }
    if (combineTokenTransactions.length >= bucketSize) {
      await Transaction.bulkInsertTokenTransactions(combineTokenTransactions)
      combineTokenTransactions = []
    }
    if (combineTokenTransactions2.length >= bucketSize) {
      await Transaction.bulkInsertTokenTransactions(combineTokenTransactions2)
      combineTokenTransactions2 = []
    }
    if (combineTokens.length >= bucketSize) {
      await Account.bulkInsertTokens(combineTokens)
      combineTokens = []
    }
  }
  if (combineReceipts.length > 0) await bulkInsertReceipts(combineReceipts)
  if (combineAccounts1.length > 0) await Account.bulkInsertAccounts(combineAccounts1)
  if (combineAccounts2.length > 0) await Account.bulkInsertAccounts(combineAccounts2)
  if (combineTransactions.length > 0) await Transaction.bulkInsertTransactions(combineTransactions)
  if (combineTokenTransactions.length > 0)
    await Transaction.bulkInsertTokenTransactions(combineTokenTransactions)
  if (combineTokenTransactions2.length > 0)
    await Transaction.bulkInsertTokenTransactions(combineTokenTransactions2)
  if (combineTokens.length > 0) await Account.bulkInsertTokens(combineTokens)
  if (!cleanReceiptsMapByCycle) resetReceiptsMap()
}

export async function queryReceiptByReceiptId(receiptId: string): Promise<Receipt | null> {
  try {
    const sql = `SELECT * FROM receipts WHERE receiptId=?`
    const receipt: DbReceipt = await db.get(sql, [receiptId])
    if (receipt) {
      if (receipt.tx) receipt.tx = JSON.parse(receipt.tx)
      if (receipt.beforeStateAccounts)
        (receipt as Receipt).beforeStateAccounts = JSON.parse(receipt.beforeStateAccounts)
      if (receipt.accounts) (receipt as Receipt).accounts = JSON.parse(receipt.accounts)
      if (receipt.result) (receipt as Receipt).result = JSON.parse(receipt.result)
      if (receipt.sign) (receipt as Receipt).sign = JSON.parse(receipt.sign)
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

    receipts.forEach((receipt: DbReceipt) => {
      if (receipt.tx) receipt.tx = JSON.parse(receipt.tx)
      if (receipt.beforeStateAccounts) receipt.beforeStateAccounts = JSON.parse(receipt.beforeStateAccounts)
      if (receipt.accounts) receipt.accounts = JSON.parse(receipt.accounts)
      if (receipt.result) (receipt as Receipt).result = JSON.parse(receipt.result)
      if (receipt.sign) receipt.sign = JSON.parse(receipt.sign)
    })

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

    receipts.forEach((receipt: DbReceipt) => {
      if (receipt.tx) receipt.tx = JSON.parse(receipt.tx)
      if (receipt.beforeStateAccounts) receipt.beforeStateAccounts = JSON.parse(receipt.beforeStateAccounts)
      if (receipt.accounts) receipt.accounts = JSON.parse(receipt.accounts)
      if (receipt.result) (receipt as Receipt).result = JSON.parse(receipt.result)
      if (receipt.sign) receipt.sign = JSON.parse(receipt.sign)
    })
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
    receipts.forEach((receipt: DbReceipt) => {
      if (receipt.tx) receipt.tx = JSON.parse(receipt.tx)
      if (receipt.beforeStateAccounts) receipt.beforeStateAccounts = JSON.parse(receipt.beforeStateAccounts)
      if (receipt.accounts) receipt.accounts = JSON.parse(receipt.accounts)
      if (receipt.result) (receipt as Receipt).result = JSON.parse(receipt.result)
      if (receipt.sign) receipt.sign = JSON.parse(receipt.sign)
    })
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

export function resetReceiptsMap(): void {
  if (Date.now() - lastReceiptMapResetTimestamp >= 120000) {
    receiptsMap = new Map()
    lastReceiptMapResetTimestamp = Date.now()
    newestReceiptsMapIsReset = false
    if (config.verbose) console.log('Receipts Map Reset!', receiptsMap)
  }
}

export function cleanReceiptsMap(endCycle: number): void {
  for (const [key, value] of receiptsMap) {
    if (value <= endCycle) receiptsMap.delete(key)
  }
  if (config.verbose) console.log('Receipts Map clean by cycles!', endCycle, receiptsMap)
}
