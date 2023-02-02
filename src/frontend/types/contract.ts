import { AccountSearchType } from "./account";

// ContractType GENERIC is not listed for now
export const contractTypes: { key: AccountSearchType; value: string }[] = [
  { key: AccountSearchType.CA, value: "All Contracts" },
  {
    key: AccountSearchType.ERC_20,
    value: "ERC 20 Tokens",
  },
  { key: AccountSearchType.ERC_721, value: "ERC 721 Tokens" },
  { key: AccountSearchType.ERC_1155, value: "ERC1155 Tokens" },
];

export enum ContractType {
  GENERIC,
  ERC_20,
  ERC_721,
  ERC_1155,
}
export interface ContractQuery {
  page?: number;
  limit?: number;
  type?: AccountSearchType;
}
