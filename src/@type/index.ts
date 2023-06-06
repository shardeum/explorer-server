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
  Receipt = 0, // EVM Receipt
  NodeRewardReceipt = 1,
  StakeReceipt = 2,
  UnstakeReceipt = 3,
  EVM_Internal = 4,
  ERC_20 = 5,
  ERC_721 = 6,
  ERC_1155 = 7,
  InternalTxReceipt = 8,
}

export interface BaseAccount {
  accountType: AccountType
}

interface BaseWrappedEVMAccount extends BaseAccount {
  /** account address in EVM space. can have different meanings depending on account type */
  ethAddress: string

  /** account hash */
  hash: string

  /** account timestamp. last time a TX changed it */
  timestamp: number
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
export type WrappedEVMAccount = BaseWrappedEVMAccount & (
    | WrappedDataReceipt
    | WrappedDataAccount
    | WrappedDataContractStorage
    | WrappedDataContractCode
  )

/** Variant data: account */
export interface WrappedDataAccount {
  accountType: AccountType.Account
  account: Account
}

/** Variant data: contract storage */
export interface WrappedDataContractStorage {
  accountType: AccountType.ContractStorage

  /** EVM CA storage key */
  key: string

  /** EVM buffer value if this is of type CA_KVP */
  value: Buffer
}

/** Variant data: contract code related and addresses */
export interface WrappedDataContractCode {
  accountType: AccountType.ContractCode

  codeByte: Buffer
  codeHash: { data: Buffer }
  contractAddress: string
}

/** Variant data: receipt related */
export interface WrappedDataReceipt {
  accountType:
    | AccountType.Receipt
    | AccountType.NodeRewardReceipt
    | AccountType.StakeReceipt
    | AccountType.UnstakeReceipt
    | AccountType.InternalTxReceipt

  /** For debug tx */
  balance: string
  amountSpent: string
  contractInfo: ERC20ContractDetail
  nonce: string
  readableReceipt: ReadableReceipt
  receipt: TxReceipt
  tokenTx: TokenTx
  txFrom: string
  txId: string
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
  logBloom: string
  contractAddress: string | null
  from: string
  to: string
  value: string
  data: string
  stakeInfo?: {
    nominee?: string
    stakeAmount?: string
    totalStakeAmount?: string
    totalUnstakeAmount?: string
    stake?: string
    reward?: string
    penalty?: string
  }
}

export interface ERC20ContractDetail {
  name: string
  decimals: string
  symbol: string
  totalSupply: string
  txHash: string
}

export interface TokenTx<C = string> {
  cycle: number
  timestamp: number
  contractAddress: string
  contractInfo?: C
  tokenFrom: string
  tokenTo: string
  tokenValue: string
  tokenType: TransactionType
  tokenEvent: string
  tokenOperator?: string | null
  transactionFee: string

  // references another tx
  txId?: string
  txHash: string
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
  Receipt, // EVM Receipt
  StakeReceipt,
  UnstakeReceipt,
  NetworkAccount,
  NodeAccount,
  NodeRewardReceipt,
  NodeAccount2,
  ContractStorage,
  ContractCode,
  InternalTxReceipt,
}

export enum TransactionSearchType {
  All = 0, // Receipt + NodeRewardReceipt + StakeReceipt + UnstakeReceipt + InternalTxReceipt
  Receipt = 1,
  NodeRewardReceipt = 2,
  StakeReceipt = 3,
  UnstakeReceipt = 4,
  EVM_Internal = 5,
  ERC_20 = 6,
  ERC_721 = 7,
  ERC_1155 = 8,
  TokenTransfer = 9, // token txs of a contract
  InternalTxReceipt = 10,
  AllExceptInternalTx = 11, // Receipt + NodeRewardReceipt + StakeReceipt + UnstakeReceipt (exclude InternalTxReceipt)
}
