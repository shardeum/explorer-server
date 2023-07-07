import web3, {Numbers} from "web3";

type EtherUnits = 'noether' | 'wei' | 'kwei' | 'Kwei' | 'babbage' | 'femtoether' | 'mwei' | 'Mwei' | 'lovelace' |
  'picoether' | 'gwei' | 'Gwei' | 'shannon' | 'nanoether' | 'nano' | 'szabo' | 'microether' | 'micro'|
  'finney' | 'milliether' | 'milli' | 'ether' | 'kether' | 'grand' | 'mether' | 'gether' | 'tether'

// `0x0` is converted to `0.`. This function converts `0.` to `0`.
export const fromWeiNoTrailingComma = (number: Numbers, unit: EtherUnits): string => {
  const result = web3.utils.fromWei(number, unit);
  return result === '0.' ? '0' : result;
}
