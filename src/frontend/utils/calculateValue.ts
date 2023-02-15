import Web3Utils from "web3-utils";
import { formatUnits } from "ethers";
import { TokenTxs, TransactionType, TransactionSearchType } from "../types";

export const calculateValue = (value: any) => {
  try {
    return round(Web3Utils.fromWei(value, "ether"));
  } catch (e) {
    return "error in calculating Value";
  }
};

export const calculateTokenValue = (
  tokenTx: TokenTxs,
  txType: TransactionType,
  tokenId = false
) => {
  try {
    if (
      txType === TransactionType.ERC_20 ||
      txType === TransactionType.Internal
    ) {
      let decimalsValue = 18;
      if (tokenTx.contractInfo.decimals)
        decimalsValue = parseInt(tokenTx.contractInfo.decimals);
      return tokenTx.tokenEvent === "Approval"
        ? tokenTx.tokenValue ===
          "0x0000000000000000000000000000000000000000000000000000000000000001"
          ? "True"
          : "False"
        : round(
            formatUnits(
              Web3Utils.hexToNumberString(tokenTx.tokenValue),
              decimalsValue
            )
          );

      // : round(Web3Utils.fromWei(tokenTx.tokenValue, "ether"));
    } else if (txType === TransactionType.ERC_721) {
      return tokenTx.tokenEvent === "Approval For All"
        ? tokenTx.tokenValue ===
          "0x0000000000000000000000000000000000000000000000000000000000000001"
          ? "True"
          : "False"
        : shortTokenValue(Web3Utils.hexToNumberString(tokenTx.tokenValue));
    } else if (txType === TransactionType.ERC_1155) {
      return tokenTx.tokenEvent === "Approval For All"
        ? tokenTx.tokenValue ===
          "0x0000000000000000000000000000000000000000000000000000000000000001"
          ? "True"
          : "False"
        : tokenTx.tokenValue.length != 130
        ? tokenTx.tokenValue
        : tokenId
        ? shortTokenValue(
            Web3Utils.hexToNumberString(tokenTx.tokenValue.substring(0, 66))
          )
        : shortTokenValue(
            Web3Utils.hexToNumberString(
              "0x" + tokenTx.tokenValue.substring(66, 130)
            )
          );
    }
  } catch (e) {
    return "error in calculating tokenValue";
  }
  return "error in calculating tokenValue";
};

export const short = (str: string): string => str.slice(0, 20) + "...";

export const shortTokenValue = (str: string): string => {
  if (str.length < 10) return str;
  else return str.slice(0, 10) + "...";
};

const countDecimals = (value: any) => {
  const splitValue = value.split(".");
  if (splitValue.length > 1) return splitValue[1].length;
  return 0;
};

export const round = (value: any) => {
  const decimals = countDecimals(value);
  if (decimals === 0) {
    return value;
  }
  if (decimals < 10) return value;
  return Number(value).toFixed(10);
};
