import { ContractType } from "./contract";

export interface AccountQuery {
  page?: number;
  count?: number;
  type?: number;
}

export interface Account {
  accountId: string;
  accountType: number;
  contractInfo: any;
  contractType: any;
  cycle: number;
  ethAddress: string;
  hash: string;
  timestamp: number;
  account: AccountDetail;
}

export interface AccountDetail {
  balance: string;
  codeHash: {
    data: number[];
    type: string;
  };
  nonce: string;
  stateRoot: {
    data: number[];
    type: string;
  };
}

export const accountTypes = [
  { key: 0, value: "All" },
  { key: 1, value: "EOA" },
  { key: 2, value: "CA" },
  { key: 3, value: "GENERIC" },
  { key: 4, value: "ERC_20" },
  { key: 5, value: "ERC_721" },
  { key: 6, value: "ERC_1155" },
  { key: 7, value: "Receipt" },
  { key: 8, value: "NetworkAccount" },
  { key: 9, value: "NodeAccount" },
  { key: 10, value: "NodeRewardReceipt" },
  { key: 11, value: "ContractStorage" },
  { key: 12, value: "ContractCode" },
];

export enum AccountSearchType {
  All, // All Accounts Type
  EOA,
  CA,
  GENERIC, // Generic Contract Type
  ERC_20,
  ERC_721,
  ERC_1155,
  Receipt,
  NetworkAccount,
  NodeAccount,
  NodeRewardReceipt,
  ContractStorage,
  ContractCode,
}

export enum AccountType {
  Account, //  EOA or CA
  ContractStorage, // Contract storage key value pair
  ContractCode, // Contract code bytes
  Receipt, //This holds logs for a TX
  Debug,
  NetworkAccount,
  NodeAccount,
  NodeRewardReceipt,
}

export interface Token {
  contractAddress: string;
  contractInfo: any;
  contractType: ContractType;
  balance: string;
}
