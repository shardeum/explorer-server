import { Account } from 'ethereumjs-util'
import { TxReceipt } from '@ethereumjs/vm/dist/types'
import { Token } from '../storage/account'

export enum AccountType {
  Account, //  EOA or CA
  ContractStorage, // Contract storage key value pair
  ContractCode, // Contract code bytes
  Receipt, //This holds logs for a TX
  Debug,
  NetworkAccount,
  NodeAccount,
  NodeRewardReceipt,
  DevAccount,
  NodeAccount2,
  StakeReceipt,
  UnstakeReceipt,
  InternalTxReceipt,
}

export enum TransactionType {
  Receipt,
  NodeRewardReceipt,
  StakeReceipt,
  UnstakeReceipt,
  Internal,
  ERC_20,
  ERC_721,
  ERC_1155,
}

export interface BaseAccount {
  accountType: AccountType
}

/**
 * Still working out the details here.
 * This has become a variant data type now that can hold an EVM account or a key value pair from CA storage
 * I think that is the shortest path for now to get syncing and repair functionality working
 *
 * Long term I am not certain if we will be able to hold these in memory.  They may have to be a temporary thing
 * that is held in memory for awhile but eventually cleared.  This would mean that we have to be able to pull these
 * from disk again, and that could be a bit tricky.
 */
export interface WrappedEVMAccount extends BaseAccount {
  // accountType: AccountType // determines how the shardus address will be computed and what variant data is present
  ethAddress: string //account address in EVM space. can have different meanings depending on account type
  hash: string //account hash
  timestamp: number //account timestamp.  last time a TX changed it

  //variant data: account
  account?: Account //actual EVM account. if this is type Account
  //variant data: contract storage
  key?: string //EVM CA storage key
  value?: Buffer //EVM buffer value if this is of type CA_KVP
  //variant data: Contract code related and addresses
  codeHash?: Buffer
  codeByte?: Buffer
  contractAddress?: string
  //variant data: Receipt related
  receipt?: TxReceipt
  readableReceipt?: ReadableReceipt
  amountSpent?: string
  txId?: string
  txFrom?: string
  contractInfo?: ERC20ContractDetail
  tokenTx?: TokenTx
  balance?: number // For debug tx
}

export interface ReadableReceipt {
  status?: boolean | string | number
  transactionHash: string
  transactionIndex: string
  blockNumber: string
  nonce: string
  blockHash: string
  cumulativeGasUsed: string
  gasUsed: string
  logs: any[]
  contractAddress: string | null
  from: string
  to: string
  value: string
  data: string
}

export interface ERC20ContractDetail {
  name: string
  decimals: string
  symbol: string
  totalSupply: string
  txHash: string
}

export interface TokenTx {
  txId: string
  txHash: string
  cycle: number
  partition: number
  timestamp: number
  tokenType: TransactionType
  tokenFrom: string
  tokenTo: string
  tokenValue: string
  tokenEvent: string
  tokenOperator?: string
  contractAddress: string
  contractInfo: string
  transactionFee: string
}

export enum InternalTXType {
  SetGlobalCodeBytes,
  InitNetwork,
  NodeReward,
}

/**
 * InternalTx is a non EVM TX that shardeum can use for utility task such as global changes
 *
 */
export interface InternalTxBase {
  isInternalTx: boolean
  internalTXType: InternalTXType
}

export interface InternalTx extends InternalTxBase {
  timestamp: number
  from?: string
  to?: string
  accountData?: WrappedEVMAccount
  network?: string // Network Account
  nodeId?: string // Node Account
}

export interface WrappedAccount {
  accountId: string
  stateId: string
  data: any
  timestamp: number
  accountCreated?: boolean
}

export interface NetworkAccount extends BaseAccount {
  id: string
  current: NetworkParameters
  next: NetworkParameters | {}
  hash: string
  timestamp: number
}

export interface NetworkParameters {
  title: string
  description: string
  nodeRewardInterval: number
  nodeRewardAmount: number
  nodePenalty: number
  stakeRequired: number
  maintenanceInterval: number
  maintenanceFee: number
}

export interface NodeAccount extends BaseAccount {
  id: string
  balance: number
  nodeRewardTime: number
  hash: string
  timestamp: number
}

export interface DecodeTxResult {
  txs: TokenTx[]
  accs: string[] // ethAddress[]
  tokens: Token[]
}

export enum AccountSearchType {
  All, // All Accounts Type
  EOA,
  CA,
  GENERIC, // Generic Contract Type
  ERC_20,
  ERC_721,
  ERC_1155,
  Receipt,
  StakeReceipt,
  UnstakeReceipt,
  NetworkAccount,
  NodeAccount,
  NodeRewardReceipt,
  NodeAccount2,
  ContractStorage,
  ContractCode,
}

export enum TransactionSearchType {
  All, // Receipt + NodeRewardReceipt
  Receipt,
  NodeRewardReceipt,
  StakeReceipt,
  UnstakeReceipt,
  Internal,
  ERC_20,
  ERC_721,
  ERC_1155,
  TokenTransfer, // token txs of a contract
}
