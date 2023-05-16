import * as db from './sqlite3storage'
import { extractValues, extractValuesFromArray } from './sqlite3storage'
import { config } from '../config/index'
import {
  AccountType,
  AccountSearchType,
  WrappedEVMAccount,
  TransactionType,
} from '../@type'
import { bufferToHex } from 'ethereumjs-util'
import { getContractInfo } from '../class/TxDecoder'

export interface Account {
  accountId: string
  cycle: number
  timestamp: number
  ethAddress: string
  account: WrappedEVMAccount
  hash: string
  accountType: AccountType.Account
  contractType: ContractType
  contractInfo: any
}

export interface Token {
  ethAddress: string
  contractAddress: string
  tokenValue: string
  tokenType: TransactionType
}

export enum ContractType {
  GENERIC,
  ERC_20,
  ERC_721,
  ERC_1155,
}

export const EOA_CodeHash = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

export async function insertAccount(account: Account) {
  try {
    const fields = Object.keys(account).join(', ')
    const placeholders = Object.keys(account).fill('?').join(', ')
    const values = extractValues(account)
    let sql = 'INSERT OR REPLACE INTO accounts (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Account', account.ethAddress || account.accountId)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert Account or it is already stored in to database', account.accountId)
  }
}

export async function bulkInsertAccounts(accounts: Account[]) {
  try {
    const fields = Object.keys(accounts[0]).join(', ')
    const placeholders = Object.keys(accounts[0]).fill('?').join(', ')
    const values = extractValuesFromArray(accounts)
    let sql = 'INSERT OR REPLACE INTO accounts (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < accounts.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully bulk inserted Accounts', accounts.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert Accounts', accounts.length)
  }
}

export async function updateAccount(_accountId: string, account: Account) {
  try {
    const sql = `UPDATE accounts SET cycle = $cycle, timestamp = $timestamp, account = $account, hash = $hash WHERE accountId = $accountId `
    await db.run(sql, {
      $cycle: account.cycle,
      $timestamp: account.timestamp,
      $account: account.account && JSON.stringify(account.account),
      $hash: account.hash,
      $accountId: account.accountId,
    })
    if (config.verbose) console.log('Successfully updated Account', account.ethAddress || account.accountId)
  } catch (e) {
    console.log(e)
    console.log('Unable to update Account', account)
  }
}

export async function insertToken(token: Token) {
  try {
    const fields = Object.keys(token).join(', ')
    const placeholders = Object.keys(token).fill('?').join(', ')
    const values = extractValues(token)
    let sql = 'INSERT OR REPLACE INTO tokens (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
    if (config.verbose) console.log('Successfully inserted Token', token.ethAddress)
  } catch (e) {
    console.log(e)
    console.log('Unable to insert Token or it is already stored in to database', token.ethAddress)
  }
}

export async function bulkInsertTokens(tokens: Token[]) {
  try {
    const fields = Object.keys(tokens[0]).join(', ')
    const placeholders = Object.keys(tokens[0]).fill('?').join(', ')
    const values = extractValuesFromArray(tokens)
    let sql = 'INSERT OR REPLACE INTO tokens (' + fields + ') VALUES (' + placeholders + ')'
    for (let i = 1; i < tokens.length; i++) {
      sql = sql + ', (' + placeholders + ')'
    }
    await db.run(sql, values)
    console.log('Successfully inserted Tokens', tokens.length)
  } catch (e) {
    console.log(e)
    console.log('Unable to bulk insert Tokens', tokens.length)
  }
}

export async function insertOrUpdateAccount(archivedCycle: any) {
  const skipTxs: string[] = []
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
      const accountData = archivedCycle.receipt.partitionTxs[partition][txId].filter((acc: any) => {
        return (
          acc?.data?.accountType === AccountType.Account ||
          acc?.data?.accountType === AccountType.NetworkAccount ||
          acc?.data?.accountType === AccountType.NodeAccount ||
          acc?.data?.accountType === AccountType.NodeAccount2
        )
      })
      let account
      if (accountData.length > 0) {
        if (config.verbose) console.log('accountData', txId, accountData)
      } else {
        continue // skip other types of tx for now // will open it back after changes are made in client to display it
      }

      for (let i = 0; i < accountData.length; i++) {
        account = accountData[i].data
        let accObj: any
        if (account.accountType === AccountType.Account) {
          accObj = {
            accountId: accountData[i].accountId,
            cycle: archivedCycle.cycleRecord.counter,
            timestamp: account.timestamp,
            ethAddress: account.ethAddress,
            account: account.account,
            hash: account.hash,
            accountType: account.accountType,
          }
        } else {
          accObj = {
            accountId: accountData[i].accountId,
            cycle: archivedCycle.cycleRecord.counter,
            timestamp: account.timestamp,
            account: account,
            hash: account.hash,
            accountType: account.accountType,
          }
        }
        const accountExist: any = await queryAccountByAddress(accObj.accountId)
        if (config.verbose) console.log('accountExist', accountExist)
        if (!accountExist) {
          await insertAccount(accObj)
        } else {
          if (accountExist.cycle < accObj.cycle && accountExist.timestamp < accObj.timestamp) {
            // console.log('update', accountExist.cycle, accObj.cycle);
            await updateAccount(accObj.accountId, accObj)
          }
        }
        if (!skipTxs.includes(txId)) {
          skipTxs.push(txId)
        }
      }
    }
  }
}

export async function queryAccountCount(type = undefined) {
  let Accounts
  try {
    if (type || type === AccountSearchType.All) {
      if (type === AccountSearchType.All) {
        const sql = `SELECT COUNT(*) FROM accounts`
        Accounts = await db.get(sql, [])
      } else if (type === AccountSearchType.CA) {
        const sql = `SELECT COUNT(*) FROM accounts WHERE accountType=? AND contractType IS NOT NULL`
        Accounts = await db.get(sql, [AccountType.Account])
      } else if (
        type === AccountSearchType.GENERIC ||
        type === AccountSearchType.ERC_20 ||
        type === AccountSearchType.ERC_721 ||
        type === AccountSearchType.ERC_1155
      ) {
        type =
          type === AccountSearchType.GENERIC
            ? ContractType.GENERIC
            : type === AccountSearchType.ERC_20
            ? ContractType.ERC_20
            : type === AccountSearchType.ERC_721
            ? ContractType.ERC_721
            : ContractType.ERC_1155
        const sql = `SELECT COUNT(*) FROM accounts WHERE accountType=? AND contractType=?`
        Accounts = await db.get(sql, [AccountType.Account, type])
      }
    } else {
      const sql = `SELECT COUNT(*) FROM accounts WHERE accountType=?`
      Accounts = await db.get(sql, [AccountType.Account])
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Account count', Accounts)
  if (Accounts) Accounts = Accounts['COUNT(*)']
  else Accounts = 0
  return Accounts
}

export async function queryAccounts(skip = 0, limit = 10, type = undefined) {
  let accounts
  try {
    if (type || type === AccountSearchType.All) {
      if (type === AccountSearchType.All) {
        const sql = `SELECT * FROM accounts ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        accounts = await db.all(sql, [])
      } else if (type === AccountSearchType.CA) {
        const sql = `SELECT * FROM accounts WHERE accountType=? AND contractType IS NOT NULL ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        accounts = await db.all(sql, [AccountType.Account])
      } else if (
        type === AccountSearchType.GENERIC ||
        type === AccountSearchType.ERC_20 ||
        type === AccountSearchType.ERC_721 ||
        type === AccountSearchType.ERC_1155
      ) {
        type =
          type === AccountSearchType.GENERIC
            ? ContractType.GENERIC
            : type === AccountSearchType.ERC_20
            ? ContractType.ERC_20
            : type === AccountSearchType.ERC_721
            ? ContractType.ERC_721
            : ContractType.ERC_1155
        const sql = `SELECT * FROM accounts WHERE accountType=? AND contractType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
        accounts = await db.all(sql, [AccountType.Account, type])
      }
    } else {
      const sql = `SELECT * FROM accounts WHERE accountType=? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
      accounts = await db.all(sql, [AccountType.Account])
    }
    if (accounts.length > 0) {
      accounts.forEach((account: any) => {
        if (account.account) account.account = JSON.parse(account.account)
        if (account.contractInfo) account.contractInfo = JSON.parse(account.contractInfo)
      })
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Accounts accounts', accounts)
  return accounts
}

export async function queryAccountByAccountId(accountId: string) {
  try {
    const sql = `SELECT * FROM accounts WHERE accountId=?`
    let account: any = await db.get(sql, [accountId])
    if (account) account.account = JSON.parse(account.account)
    if (account && account.contractInfo) account.contractInfo = JSON.parse(account.contractInfo)
    if (config.verbose) console.log('Account accountId', account)
    return account
  } catch (e) {
    console.log(e)
  }
}

export async function queryAccountByAddress(address: string, accountType = AccountType.Account) {
  try {
    const sql = `SELECT * FROM accounts WHERE accountType=? AND ethAddress=? ORDER BY accountType ASC LIMIT 1`
    const account: any = await db.get(sql, [accountType, address])
    if (account) account.account = JSON.parse(account.account)
    if (account && account.contractInfo) account.contractInfo = JSON.parse(account.contractInfo)
    if (config.verbose) console.log('Account Address', account)
    return account
  } catch (e) {
    console.log(e)
  }
}

export async function queryAccountCountBetweenCycles(startCycleNumber: number, endCycleNumber: number) {
  let accounts
  try {
    const sql = `SELECT COUNT(*) FROM accounts WHERE cycle BETWEEN ? AND ?`
    accounts = await db.get(sql, [startCycleNumber, endCycleNumber])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) {
    console.log('Account count between cycle', accounts)
  }
  if (accounts) accounts = accounts['COUNT(*)']
  else accounts = 0
  return accounts
}

export async function queryAccountsBetweenCycles(
  skip = 0,
  limit = 10000,
  startCycleNumber: number,
  endCycleNumber: number
) {
  let accounts
  try {
    const sql = `SELECT * FROM accounts WHERE cycle BETWEEN ? AND ? ORDER BY cycle DESC, timestamp DESC LIMIT ${limit} OFFSET ${skip}`
    accounts = await db.all(sql, [startCycleNumber, endCycleNumber])
    if (accounts.length > 0) {
      accounts.forEach((account: any) => {
        if (account.account) account.account = JSON.parse(account.account)
        if (account.contractInfo) account.contractInfo = JSON.parse(account.contractInfo)
      })
    }
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) {
    console.log('Account accounts', accounts ? accounts.length : accounts, 'skip', skip)
  }
  return accounts
}

export async function queryTokensByAddress(address: string, detail = false) {
  try {
    const sql = `SELECT * FROM tokens WHERE ethAddress=?`
    let tokens = (await db.all(sql, [address])) as Token[]
    if (detail) {
      let filterTokens = []
      for (let i = 0; i < tokens.length; i++) {
        const { contractAddress, tokenValue } = tokens[i]
        const accountExist = await queryAccountByAccountId(
          contractAddress.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
        )
        if (accountExist && accountExist.contractType) {
          filterTokens.push({
            contractAddress: contractAddress,
            contractInfo: accountExist.contractInfo,
            contractType: accountExist.contractType,
            balance: tokenValue,
          })
        }
      }
      tokens = filterTokens
    }
    if (config.verbose) console.log('Tokens of an address', tokens)
    return tokens
  } catch (e) {
    console.log(e)
  }
}

export async function queryTokenBalance(contractAddress: string, addressToSearch: string) {
  const sql = `SELECT * FROM tokens WHERE ethAddress=? AND contractAddress=?`
  let token = (await db.get(sql, [addressToSearch, contractAddress])) as Token
  if (config.verbose) console.log('Token balance', token)
  if (!token) return { success: false, error: 'tokenBalance is not found' }
  return {
    success: true,
    balance: token?.tokenValue,
  }
}

export async function queryTokenHolderCount(contractAddress: string) {
  let tokens
  try {
    const sql = `SELECT COUNT(*) FROM tokens WHERE contractAddress=?`
    tokens = await db.get(sql, [contractAddress])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Token holder count', tokens)
  if (tokens) tokens = tokens['COUNT(*)']
  else tokens = 0
  return tokens
}

export async function queryTokenHolders(skip = 0, limit = 10, contractAddress: string) {
  let tokens
  try {
    const sql = `SELECT * FROM tokens WHERE contractAddress=? ORDER BY tokenValue DESC LIMIT ${limit} OFFSET ${skip}`
    tokens = await db.all(sql, [contractAddress])
  } catch (e) {
    console.log(e)
  }
  if (config.verbose) console.log('Token holders', tokens)
  return tokens
}

export async function processAccountData(accounts: any) {
  console.log('accounts size', accounts.length)
  if (accounts && accounts.length <= 0) return
  let bucketSize = 1000
  let combineAccounts1 = [] // For AccountType (Account(EOA), ContractStorage, ContractCode)
  let combineAccounts2 = [] // For AccountType (NetworkAccount, NodeAccount)

  let transactions = []

  for (let j = 0; j < accounts.length; j++) {
    let account = accounts[j]
    try {
      if (typeof account.data === 'string') account.data = JSON.parse(account.data)
    } catch (e) {
      console.log('Error in parsing account data', account.data)
      continue
    }
    const accountType = account.data.accountType
    let accObj
    if (
      accountType === AccountType.Account ||
      accountType === AccountType.ContractStorage ||
      accountType === AccountType.ContractCode
    ) {
      accObj = {
        accountId: account.accountId,
        cycle: account.cycleNumber,
        timestamp: account.timestamp,
        ethAddress: account.data.ethAddress.toLowerCase(),
        account: accountType === AccountType.Account ? account.data.account : account.data,
        hash: account.hash,
        accountType: account.data.accountType,
      }
      if (accountType === AccountType.Account && bufferToHex(accObj.account.codeHash.data) !== EOA_CodeHash) {
        const { contractInfo, contractType } = await getContractInfo(accObj.ethAddress)
        accObj.contractInfo = contractInfo
        accObj.contractType = contractType
        await insertAccount(accObj)
        continue
      } else {
        combineAccounts1.push(accObj)
      }
    } else if (
      accountType === AccountType.NetworkAccount ||
      accountType === AccountType.NodeAccount ||
      accountType === AccountType.NodeAccount2
    ) {
      accObj = {
        accountId: account.accountId,
        cycle: account.cycleNumber,
        timestamp: account.timestamp,
        ethAddress: account.accountId, // Adding accountId as ethAddess for these account types for now; since we need ethAddress for mysql index
        account: account.data,
        hash: account.hash,
        accountType: account.data.accountType,
      }
      combineAccounts2.push(accObj)
    }
    if (
      accountType === AccountType.Receipt ||
      accountType === AccountType.NodeRewardReceipt ||
      accountType === AccountType.StakeReceipt ||
      accountType === AccountType.UnstakeReceipt
    ) {
      transactions.push(account)
    }
    if (combineAccounts1.length >= bucketSize) {
      await bulkInsertAccounts(combineAccounts1)
      combineAccounts1 = []
    }
    if (combineAccounts2.length >= bucketSize) {
      await bulkInsertAccounts(combineAccounts2)
      combineAccounts2 = []
    }
  }
  if (combineAccounts1.length > 0) await bulkInsertAccounts(combineAccounts1)
  if (combineAccounts2.length > 0) await bulkInsertAccounts(combineAccounts2)
  return transactions
}
