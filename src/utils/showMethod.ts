import { Transaction, TokenTxs, TransactionType } from "../types";

export const showTxMethod = (tx: Transaction | TokenTxs) => {
  const data = tx?.wrappedEVMAccount?.readableReceipt.data;

  const methodCode = data && data.length > 10 ? data.substr(0, 10) : null;

  return tx?.tokenEvent
    ? tx.tokenEvent
    : tx?.wrappedEVMAccount?.readableReceipt.from.length === 64
    ? "Node Reward"
    : tx?.transactionType &&
      tx?.transactionType === TransactionType.StakeReceipt
    ? "Stake"
    : tx?.transactionType &&
      tx?.transactionType === TransactionType.UnstakeReceipt
    ? "Unstake"
    : tx?.wrappedEVMAccount?.readableReceipt.to
    ? ERC_TOKEN_METHOD_DIC[methodCode]
      ? ERC_TOKEN_METHOD_DIC[methodCode]
      : "Transfer"
    : "Contract";
};

export const ERC_TOKEN_METHOD_DIC = {
  "0xa9059cbb": "Transfer",
  "0xa978501e": "Transfer From", // This one seems for old transfer type
  "0x23b872dd": "Transfer From",
  "0x095ea7b3": "Approve",
  "0xe63d38ed": "Disperse ETH",
  "0xc73a2d60": "Disperse Token",
  "0xf242432a": "Safe Transfer From",
  "0x42842e0e": "Safe Transfer From",
  "0x2eb2c2d6": "Safe Batch Transfer From",
  "0xa22cb465": "Set Approval For All",
  "0x3593cebc": "Batch Transfer",
  "0x4885b254": "Batch Transfer From",
  "0xc9c65396": "Create Pair",
  "0x02751cec": "Remove Liquidity ETH",
  "0x1249c58b": "Mint",
  "0x7ff36ab5": "Swap Exact ETH For Tokens",
  "0x18cbafe5": "Swap Exact Tokens For ETH",
  "0x38ed1739": "Swap Exact Tokens For Tokens",
  "0x2e1a7d4d": "Withdraw",
  "0xd0e30db0": "Deposit",
  "0xf305d719": "Add Liquidity ETH",
  "0xe8e33700": "Add Liquidity",
};
