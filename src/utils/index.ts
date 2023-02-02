export const getClosestAddress = (txid: string, addresses: string[]) => {
  const distances = addresses.map((addr) =>
    Math.abs(parseInt(txid.slice(0, 5), 16) - parseInt(addr.slice(0, 5), 16))
  )
  const smallestDistance = distances.indexOf(Math.min(...distances))
  return addresses[smallestDistance]
}

export const getKeyFromTransaction = (tx: any): string[] => {
  const result: any = {
    sourceKeys: [],
    targetKeys: [],
    allKeys: [],
    timestamp: tx.timestamp,
  }
  switch (tx.type) {
    case 'init_network':
      // result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'snapshot':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'email':
      result.sourceKeys = [tx.signedTx.from]
      break
    case 'gossip_email_hash':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.account]
      break
    case 'verify':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'register':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.aliasHash]
      break
    case 'create':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.to]
      break
    case 'transfer':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.to, tx.network]
      break
    case 'distribute':
      result.sourceKeys = [tx.from]
      result.targetKeys = [...tx.recipients, tx.network]
      break
    case 'message':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.to, tx.chatId, tx.network]
      break
    case 'toll':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'friend':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'remove_friend':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.to, tx.network]
      break
    case 'node_reward':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.to, tx.network]
      break
    case 'stake':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'remove_stake':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'remove_stake_request':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'claim_reward':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'snapshot_claim':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network]
      break
    case 'issue':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.issue, tx.proposal, tx.network]
      break
    case 'dev_issue':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.devIssue, tx.network]
      break
    case 'proposal':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.issue, tx.proposal, tx.network]
      break
    case 'dev_proposal':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.devIssue, tx.devProposal, tx.network]
      break
    case 'vote':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.issue, tx.proposal, tx.network]
      break
    case 'dev_vote':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.devIssue, tx.devProposal, tx.network]
      break
    case 'tally':
      result.sourceKeys = [tx.from]
      result.targetKeys = [...tx.proposals, tx.issue, tx.network]
      break
    case 'apply_tally':
      result.targetKeys = [tx.network]
      break
    case 'dev_tally':
      result.sourceKeys = [tx.from]
      result.targetKeys = [...tx.devProposals, tx.devIssue, tx.network]
      break
    case 'apply_dev_tally':
      result.targetKeys = [tx.network]
      break
    case 'parameters':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.network, tx.issue]
      break
    case 'apply_parameters':
      result.targetKeys = [tx.network]
      break
    case 'dev_parameters':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.devIssue, tx.network]
      break
    case 'apply_dev_parameters':
      result.targetKeys = [tx.network]
      break
    case 'developer_payment':
      result.sourceKeys = [tx.from]
      result.targetKeys = [tx.developer, tx.network]
      break
    case 'apply_developer_payment':
      result.targetKeys = [tx.network]
      break
  }
  result.allKeys = result.allKeys.concat(result.sourceKeys, result.targetKeys)
  return result.allKeys
}

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
export function validateTypes(inp: any, def: any) {
  if (inp === undefined) return 'input is undefined'
  if (inp === null) return 'input is null'
  if (typeof inp !== 'object') return 'input must be object, not ' + typeof inp
  const map: any = {
    string: 's',
    number: 'n',
    boolean: 'b',
    bigint: 'B',
    array: 'a',
    object: 'o',
  }
  const imap: any = {
    s: 'string',
    n: 'number',
    b: 'boolean',
    B: 'bigint',
    a: 'array',
    o: 'object',
  }
  const fields = Object.keys(def)
  for (const name of fields) {
    const types = def[name]
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
  return ''
}

export async function sleep(time: number) {
  return new Promise((resolve: any) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}
