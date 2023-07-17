import * as crypto from '@shardus/crypto-utils'
import { config } from '../config';
import * as db from '../storage/sqlite3storage'
import { socketClient } from './websocket'

type contract_address = string;
type strigified_subscription = string;

export const LOG_SUBSCRIPTIONS_BY_ADDRESS = new Map<
  contract_address,
  Map<strigified_subscription, Set<string>>
>()

export const LOG_SUBSCRIPTIONS_BY_ID = new Map<string, { address: string[]; topics: string[] }>()

export const SOCKETID_BY_LOG_STRINGIFIED = new Map<string, Set<string>>()

export const LOG_SUBSCRIPTIONS_BY_SOCKETID = new Map<string, Set<string>>()

// implement this function at O(1)
export const addLogSubscriptions: (
  addresses: string[],
  topics: string[],
  subscription_id: string,
  socketId: string
) => void = (addresses: string[], topics: string[], subscription_id: string, socketId: string) => {
  if (!LOG_SUBSCRIPTIONS_BY_SOCKETID.has(socketId)) {
    LOG_SUBSCRIPTIONS_BY_SOCKETID.set(socketId, new Set([subscription_id]))
  } else {
    LOG_SUBSCRIPTIONS_BY_SOCKETID.get(socketId).add(subscription_id)
  }

  if (!LOG_SUBSCRIPTIONS_BY_ID.has(subscription_id)) {
    LOG_SUBSCRIPTIONS_BY_ID.set(subscription_id, { address: addresses, topics })
  }
  for (const addr of addresses) {
    const filter_obj = { address: addr, topics: topics }
    const stringified = crypto.stringify(filter_obj)
    console.log('stringified', stringified)

    if (!SOCKETID_BY_LOG_STRINGIFIED.has(stringified)) {
      SOCKETID_BY_LOG_STRINGIFIED.set(stringified, new Set([socketId]))
    } else {
      SOCKETID_BY_LOG_STRINGIFIED.get(stringified).add(socketId)
    }

    if (!LOG_SUBSCRIPTIONS_BY_ADDRESS.has(addr)) {
      const tmp = new Map<strigified_subscription, Set<string>>()
      tmp.set(stringified, new Set([subscription_id]))
      LOG_SUBSCRIPTIONS_BY_ADDRESS.set(addr, tmp)

      continue
    } else {
      if (!LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).has(stringified)) {
        LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).set(stringified, new Set([subscription_id]))
        continue
      }
      LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).get(stringified).add(subscription_id)
    }
  }

  // console.log(LOG_SUBSCRIPTIONS_BY_ADDRESS);
}

export const removeLogSubscription: (subscription_id: string, socketId: string) => void = (
  subscription_id: string,
  socketId: string
) => {
  if (!LOG_SUBSCRIPTIONS_BY_ID.has(subscription_id)) {
    return
  }

  const { address, topics } = LOG_SUBSCRIPTIONS_BY_ID.get(subscription_id)

  // let's find subsription reference O(1)
  for (const addr of address) {
    const filter_obj = { address: addr, topics: topics }
    const stringified = crypto.stringify(filter_obj)

    if (SOCKETID_BY_LOG_STRINGIFIED.has(stringified)) {
      SOCKETID_BY_LOG_STRINGIFIED.get(stringified).delete(socketId)
      if (SOCKETID_BY_LOG_STRINGIFIED.get(stringified).size === 0) {
        SOCKETID_BY_LOG_STRINGIFIED.delete(stringified)
      }
    }

    if (!LOG_SUBSCRIPTIONS_BY_ADDRESS.has(addr)) continue

    if (LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).size === 0) {
      LOG_SUBSCRIPTIONS_BY_ADDRESS.delete(addr)
      continue
    }

    if (!LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).has(stringified)) {
      continue
    }
    LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).get(stringified).delete(subscription_id)

    if (LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).get(stringified).size === 0) {
      LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).delete(stringified)

      // in this case there's no ref left that indicate someone is subscribe this contract
      // remove it from the map
      if (LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).size === 0) {
        LOG_SUBSCRIPTIONS_BY_ADDRESS.delete(addr)
      }
    }
  }
  // console.log(LOG_SUBSCRIPTIONS_BY_ADDRESS)
  LOG_SUBSCRIPTIONS_BY_ID.delete(subscription_id)
  // console.log(LOG_SUBSCRIPTIONS_BY_ADDRESS);
  LOG_SUBSCRIPTIONS_BY_SOCKETID.get(socketId).delete(subscription_id)
}

// this is O(n), can't improve any more than that
// this will only be call when an rpc disconnect happen, which is not frequent
export const removeLogSubscriptionBySocketId = (socket_id: string): void => {
  if (!LOG_SUBSCRIPTIONS_BY_SOCKETID.has(socket_id)) return

  const subscription_ids = LOG_SUBSCRIPTIONS_BY_SOCKETID.get(socket_id)

  for (const subscription_id of Array.from(subscription_ids)) {
    // O(1)
    removeLogSubscription(subscription_id, socket_id)
  }

  if (LOG_SUBSCRIPTIONS_BY_SOCKETID.get(socket_id).size === 0) {
    LOG_SUBSCRIPTIONS_BY_SOCKETID.delete(socket_id)
  }
}

// these value will get populated later
export const evmLogDiscoveryMeta = {
  lastObservedTimestamp: 0,
}

export async function evmLogDiscovery(): Promise<void> {
  const currentObservingTimestamp = Date.now()
  // console.log("Discovering Logs...", evmLogDiscoveryMeta);
  // console.log("LOG_SUBSCRIPTIONS_BY_ADDRESS",LOG_SUBSCRIPTIONS_BY_ADDRESS);
  // console.log("LOG_SUBSCRIPTIONS_BY_ID",LOG_SUBSCRIPTIONS_BY_ID);
  // console.log("LOG_SUBSCRIPTIONS_BY_SOCKETID",LOG_SUBSCRIPTIONS_BY_SOCKETID);
  for (const [key, value] of LOG_SUBSCRIPTIONS_BY_ADDRESS) {
    const contract_address = key === 'AllContracts' ? null : key
    const stringifies = [...value.keys()]
    for (let i = 0; i < stringifies.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const { topics } = JSON.parse(stringifies[i])
      const startTime = evmLogDiscoveryMeta.lastObservedTimestamp

      const rows = await getLogs(
        startTime,
        currentObservingTimestamp,
        contract_address,
        topics[0],
        topics[1],
        topics[2],
        topics[3]
      )
      // console.log("LOGS:",rows, "SUBSCRIBERS",value.get(stringifies[i]))

      // no async await.
      if (rows.length > 0) {
        const subscribers_for_this_group_of_logs = Array.from(value.get(stringifies[i]))
        const requested_RPCs = SOCKETID_BY_LOG_STRINGIFIED.get(stringifies[i])

        if (!requested_RPCs) continue

        for (const socketId of Array.from(requested_RPCs)) {
          const conn = socketClient.get(socketId)
          if (!socketClient.has(socketId) || conn.socket.readyState === 2 || conn.socket.readyState === 3) {
            conn.socket.close()
            continue
          }
          conn.socket.send(
            JSON.stringify({
              method: 'log_found',
              logs: rows,
              subscribers: subscribers_for_this_group_of_logs,
            })
          )
        }
      }
    }
  }
  evmLogDiscoveryMeta.lastObservedTimestamp = currentObservingTimestamp
}

async function getLogs(
  startTime = 0,
  endTime = Date.now(),
  contractAddress = undefined,
  topic0 = undefined,
  topic1 = undefined,
  topic2 = undefined,
  topic3 = undefined
): Promise<any> {
  let logs
  try {
    let sql = `SELECT log FROM logs `
    let inputs = []
    if (contractAddress && topic0 && topic1 && topic2 && topic3) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=? AND topic2=? AND topic3=?`
      inputs = [contractAddress, topic0, topic1, topic2, topic3]
    } else if (contractAddress && topic0 && topic1 && topic2) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=? AND topic2=?`
      inputs = [contractAddress, topic0, topic1, topic2]
    } else if (contractAddress && topic0 && topic1) {
      sql += `WHERE contractAddress=? AND topic0=? AND topic1=?`
      inputs = [contractAddress, topic0, topic1]
    } else if (contractAddress && topic0) {
      sql += `WHERE contractAddress=? AND topic0=?`
      inputs = [contractAddress, topic0]
    } else if (contractAddress) {
      sql += `WHERE contractAddress=?`
      inputs = [contractAddress]
    } else if (topic0 && topic1 && topic2 && topic3) {
      sql += `WHERE topic0=? AND topic1=? AND topic2=? AND topic3=?`
      inputs = [topic0, topic1, topic2, topic3]
    } else if (topic0 && topic1 && topic2) {
      sql += `WHERE topic0=? AND topic1=? AND topic2=?`
      inputs = [topic0, topic1, topic2]
    } else if (topic0 && topic1) {
      sql += `WHERE topic0=? AND topic1=?`
      inputs = [topic0, topic1]
    } else if (topic0) {
      sql += `WHERE topic0=?`
      inputs = [topic0]
    }
    if (startTime >= 0 && endTime >= 0) {
      if (inputs.length > 0) sql += ` AND timestamp BETWEEN ? AND ?`
      else sql += ` WHERE timestamp BETWEEN ? AND ?`
      inputs = [...inputs, ...[startTime, endTime]]
    }
    // console.log(sql, inputs);
    logs = await db.all(sql, inputs)
  } catch (e) {
    console.log(e)
    return []
  }
  let rpc_ready_logs = []
  if (logs.length > 0) {
    rpc_ready_logs = logs.map((log: any) => {
      if (log.log) return JSON.parse(log.log)
    })
  }
  if (config.verbose) console.log('Log logs', logs)
  return rpc_ready_logs
}
