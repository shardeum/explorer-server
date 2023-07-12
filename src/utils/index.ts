export const short = (str: string): string => str.slice(0, 8)

/*
inp is the input object to be checked
def is an object defining the expected input
{name1:type1, name1:type2, ...}
name is the name of the field
type is a string with the first letter of 'string', 'number', 'Bigint', 'boolean', 'array' or 'object'
type can end with '?' to indicate that the field is optional and not required
---
Example of def:
{fullname:'s', age:'s?',phone:'sn'}
---
Returns a string with the first error encountered or and empty string ''.
Errors are: "[name] is required" or "[name] must be, [type]"
*/
export function validateTypes(inp: object, def: object): string {
  if (inp === undefined) return 'input is undefined'
  if (inp === null) return 'input is null'
  if (typeof inp !== 'object') return 'input must be object, not ' + typeof inp
  const map = {
    string: 's',
    number: 'n',
    boolean: 'b',
    bigint: 'B',
    array: 'a',
    object: 'o',
  }
  const imap = {
    s: 'string',
    n: 'number',
    b: 'boolean',
    B: 'bigint',
    a: 'array',
    o: 'object',
  }

  // the keys and values of `def` are only ever hardcoded in this codebase.
  /* eslint-disable security/detect-object-injection */
  for (const [name, types] of Object.entries(def)) {
    const opt = types.substr(-1, 1) === '?' ? 1 : 0
    if (inp[name] === undefined && !opt) return name + ' is required'
    if (inp[name] !== undefined) {
      if (inp[name] === null && !opt) return name + ' cannot be null'
      let found = 0
      let be = ''
      for (let t = 0; t < types.length - opt; t++) {
        let it = map[typeof inp[name]]
        it = Array.isArray(inp[name]) ? 'a' : it
        const is = types.substr(t, 1)
        if (it === is) {
          found = 1
          break
        } else be += ', ' + imap[is]
      }
      if (!found) return name + ' must be' + be
    }
  }
  /* eslint-enable security/detect-object-injection */
  return ''
}

export function padAndPrefixBlockNumber(hexString: string | number, padding = '0', count = 16): string {
  if (typeof hexString === 'number' || /^[0-9]+$/.test(hexString.toString())) {
    hexString = '0x' + parseInt(hexString.toString(), 10).toString(16);
  }

  if (typeof hexString !== 'string' || typeof padding !== 'string' || typeof count !== 'number') {
    throw new TypeError('Invalid argument type');
  }

  if (hexString.substring(0, 2) !== '0x' || !/^[0-9a-fA-F]+$/.test(hexString.slice(2))) {
    throw new Error('Invalid hexString: must start with 0x and contain only hexadecimal digits');
  }

  if (padding.length !== 1) {
    throw new Error('Invalid padding: must be a single character');
  }

  const hexNumber = hexString.slice(2);
  const paddingNeeded = count - hexNumber.length;

  if (paddingNeeded < 0) {
    throw new Error('Invalid count: count must be greater or equal to length of the hex string.');
  }

  const paddedHexString = '0x' + padding.repeat(paddingNeeded) + hexNumber;

  return paddedHexString;
}

export async function sleep(time: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}
