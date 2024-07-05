import web3 from 'web3'
import { utils } from 'ethers'
import { TokenTx, TokenType, TransactionType } from '../../types'
import BN from 'bn.js'
import { fromWeiNoTrailingComma } from './fromWeiNoTrailingComma'

export const calculateValue = (value: string | BN): string => {
  try {
    return round(fromWeiNoTrailingComma(value, 'ether'))
  } catch (e) {
    return 'error in calculating Value'
  }
}

export const calculateFullValue = (value: string | BN): string => {
  try {
    return fromWeiNoTrailingComma(value, 'ether')
  } catch (e) {
    return 'error in calculating Value'
  }
}

export const calculateTokenValue = (
  tokenTx: TokenTx,
  txType: TransactionType | TokenType,
  tokenId = false,
  fullValue = true
): string => {
  try {
    if (txType === TokenType.ERC_20 || txType === TokenType.EVM_Internal) {
      const decimalsValue = tokenTx.contractInfo.decimals ? parseInt(tokenTx.contractInfo.decimals) : 18

      return tokenTx.tokenValue === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        ? 'unlimited'
        : fullValue
        ? utils.formatUnits(tokenTx.tokenValue, decimalsValue)
        : roundTokenValue(utils.formatUnits(tokenTx.tokenValue, decimalsValue))

      // : round(web3.utils.fromWei(tokenTx.tokenValue, "ether"));
    } else if (txType === TokenType.ERC_721) {
      return tokenTx.tokenEvent === 'Approval For All'
        ? tokenTx.tokenValue === '0x0000000000000000000000000000000000000000000000000000000000000001'
          ? 'True'
          : 'False'
        : shortTokenValue(web3.utils.hexToNumberString(tokenTx.tokenValue))
    } else if (txType === TokenType.ERC_1155) {
      return tokenTx.tokenEvent === 'Approval For All'
        ? tokenTx.tokenValue === '0x0000000000000000000000000000000000000000000000000000000000000001'
          ? 'True'
          : 'False'
        : tokenTx.tokenValue.length != 130
        ? tokenTx.tokenValue
        : tokenId
        ? shortTokenValue(web3.utils.hexToNumberString(tokenTx.tokenValue.substring(0, 66)))
        : shortTokenValue(web3.utils.hexToNumberString('0x' + tokenTx.tokenValue.substring(66, 130)))
    }
  } catch (e) {
    return 'error in calculating tokenValue'
  }
  return 'error in calculating tokenValue'
}

export const short = (str: string): string => (str ? str.slice(0, 20) + '...' : '')

export const shortTokenValue = (str: string): string => {
  if (!str) return ''
  if (str.length < 10) return str
  else return str.slice(0, 10) + '...'
}

const countDecimals = (value: string | BN): number => {
  if (value instanceof BN) {
    value = value.toString()
  }
  const splitValue = value.split('.')
  if (splitValue.length > 1) return splitValue[1].length
  return 0
}

export const round = (value: string): string => {
  const decimals = countDecimals(value)
  if (decimals === 0) {
    return value
  }
  if (decimals < 10) return value
  return Number(value).toFixed(10)
}

export const roundTokenValue = (value: string): string => {
  const decimals = countDecimals(value)
  if (decimals === 0) {
    return value
  }
  if (decimals < 18) return value
  return Number(value).toFixed(18)
}
