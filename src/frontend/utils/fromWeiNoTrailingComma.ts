import web3, {Numbers} from "web3";

// `0x0` is converted to `0.`. This function converts `0.` to `0`.
export const fromWeiNoTrailingComma = (number: Numbers, unit): string => {
  const result = web3.utils.fromWei(number, unit);
  return result === '0.' ? '0' : result;
}
