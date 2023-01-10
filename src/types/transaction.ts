export interface TokenTxs {
  contractAddress: string;
  contractInfo: any;
  cycle: number;
  timestamp: number;
  tokenEvent: string;
  tokenFrom: string;
  tokenOperator: any;
  tokenTo: string;
  tokenType: number;
  tokenValue: string;
  transactionFee: string;
  txHash: string;
  txId: string;
  _id: number;
}

export interface ReadableReceipt {
  blockHash: string;
  blockNumber: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  data: string;
  from: string;
  gasUsed: string;
  logs: string;
  nonce: string;
  status: number;
  to: string;
  transactionHash: string;
  transactionIndex: string;
  value: string;
}

export interface WrappedEVMAccount {
  accountType: number;
  ethAddress: string;
  hash: string;
  readableReceipt: ReadableReceipt;
  timestamp: number;
  txFrom: string;
  txId: string;
}

export interface Result {
  txIdShort: string;
  txResult: string;
}

export interface Transaction {
  accountId: string;
  cycle: number;
  originTxData: string;
  partition: any;
  result: Result;
  timestamp: number;
  transactionType: number;
  txFrom: string;
  txHash: string;
  txId: string;
  txTo: string;
  wrappedEVMAccount?: WrappedEVMAccount;
  tokenTxs?: TokenTxs[];
}

export interface TransactionQuery {
  page?: number;
  count?: number;
  txType?: number;
}

export enum TransactionSearchType {
  All, // Receipt + NodeRewardReceipt
  Receipt,
  NodeRewardReceipt,
  Internal,
  ERC_20,
  ERC_721,
  ERC_1155,
  TokenTransfer, // token txs of a contract
}

export const transactionTypes: { key: TransactionSearchType; value: string }[] =
  [
    { key: TransactionSearchType.All, value: "All Transactions" },
    {
      key: TransactionSearchType.NodeRewardReceipt,
      value: "Node Reward Transactions",
    },
    { key: TransactionSearchType.Internal, value: "Internal Transactions" },
    { key: TransactionSearchType.ERC_20, value: "ERC 20 Token Transactions" },
    { key: TransactionSearchType.ERC_721, value: "ERC 721 Token Transactions" },
    {
      key: TransactionSearchType.ERC_1155,
      value: "ERC 1155 Token Transactions",
    },
  ];

export enum TransactionType {
  Receipt,
  NodeRewardReceipt,
  Internal,
  ERC_20,
  ERC_721,
  ERC_1155,
}
