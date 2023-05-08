import { queryLatestCycleRecords } from "../storage/cycle";
import { queryLogs, queryLogsBetweenCycles } from "../storage/log";
import * as crypto from '@shardus/crypto-utils'
import { stringify } from "qs";
import { config } from '../config';
import axios from "axios";
import * as db from '../storage/sqlite3storage'

type contract_address = string;
type strigified_subscription = string;
type LogSubscriptionsAddress = Map<contract_address, Map<strigified_subscription, Set<string>>>
type LogSubscriptionsID = Map<string, {address: string[], topics: string[]}>


// export const LOG_SUBSCRIPTIONS_IPPORT_ADDRESS: LOG_SUBSCRIPTIONS_IPPORT_ADDRESS = new Map();
// export const LOG_SUBSCRIPTIONS_IPPORT_ID: LOG_SUBSCRIPTIONS_IPPORT_ID = new Map();

export const LOG_SUBSCRIPTIONS_BY_ADDRESS = new Map<contract_address, Map<strigified_subscription, Set<string>>>();

export const LOG_SUBSCRIPTIONS_BY_ID = new Map<string, {address: string[], topics: string[]}>();

export const IPPORT_BY_LOG_STRINGIFIED = new Map<string, Set<string>>();

// implement this function at O(1)
export const addLogSubscriptions = (
  addresses: string[], 
  topics: string[], 
  subscription_id: string, 
  rpcIpport: string
) => {


    if(!LOG_SUBSCRIPTIONS_BY_ID.has(subscription_id)){
      LOG_SUBSCRIPTIONS_BY_ID.set(subscription_id,{ address: addresses, topics});
    }
  for(const addr of addresses){

    const filter_obj = {address: addr, topics: topics}
    const stringified = crypto.stringify(filter_obj)
    console.log("stringified",stringified);

    if(!IPPORT_BY_LOG_STRINGIFIED.has(stringified)){
      IPPORT_BY_LOG_STRINGIFIED.set(stringified, new Set([rpcIpport]))
    }
    else{
      IPPORT_BY_LOG_STRINGIFIED.get(stringified).add(rpcIpport)
    }

    if(!LOG_SUBSCRIPTIONS_BY_ADDRESS.has(addr)){
      const tmp = new Map<strigified_subscription, Set<string>>();
      tmp.set(stringified, new Set([subscription_id]));
      LOG_SUBSCRIPTIONS_BY_ADDRESS.set(addr, tmp);


      continue
    }
    else{
      if(!LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).has(stringified)){
        LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).set(stringified, new Set([subscription_id]));
        continue
      }
      LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).get(stringified).add(subscription_id);
    }
  }
  
  // console.log(LOG_SUBSCRIPTIONS_BY_ADDRESS);
}

export const removeLogSubscription = (subscription_id: string, rpcIpport: string) => {

    if(!LOG_SUBSCRIPTIONS_BY_ID.has(subscription_id)){
      return true
    }

    const { address, topics } = LOG_SUBSCRIPTIONS_BY_ID.get(subscription_id)

    // let's find subsription reference O(1)
  for(const addr of address){

    const filter_obj = {address: addr, topics: topics}
    const stringified = crypto.stringify(filter_obj)

    if(IPPORT_BY_LOG_STRINGIFIED.has(stringified)){
      IPPORT_BY_LOG_STRINGIFIED.get(stringified).delete(rpcIpport); 
      if(IPPORT_BY_LOG_STRINGIFIED.get(stringified).size === 0){
        IPPORT_BY_LOG_STRINGIFIED.delete(stringified);
      }
    }

    if(!LOG_SUBSCRIPTIONS_BY_ADDRESS.has(addr)) continue

    if(LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).size === 0) {
      LOG_SUBSCRIPTIONS_BY_ADDRESS.delete(addr)
      continue
    }

    if(!LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).has(stringified)){
      continue
    }
    LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).get(stringified).delete(subscription_id);

    if(LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).get(stringified).size === 0){
      LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).delete(stringified)

      // in this case there's no ref left that indicate someone is subscribe this contract
      // remove it from the map
      if(LOG_SUBSCRIPTIONS_BY_ADDRESS.get(addr).size === 0){
        LOG_SUBSCRIPTIONS_BY_ADDRESS.delete(addr)
      }

    }

  }
  // console.log(LOG_SUBSCRIPTIONS_BY_ADDRESS)
  LOG_SUBSCRIPTIONS_BY_ID.delete(subscription_id);
  // console.log(LOG_SUBSCRIPTIONS_BY_ADDRESS);
}
// these value will get populated later
export const evmLogDiscoveryMeta = {
  lastObservedTimestamp: 0,
}

export async function evmLogDiscovery() {
  const currentObservingTimestamp = Date.now();
  // console.log("Discovering Logs...", evmLogDiscoveryMeta);
  // console.log("LOG_SUBSCRIPTIONS_BY_ADDRESS",LOG_SUBSCRIPTIONS_BY_ADDRESS);
  // console.log("LOG_SUBSCRIPTIONS_BY_ID",LOG_SUBSCRIPTIONS_BY_ID);
  // console.log("IPPORT_BY_LOG_STRINGIFIED",IPPORT_BY_LOG_STRINGIFIED);
  for(const [key, value] of LOG_SUBSCRIPTIONS_BY_ADDRESS){
    const contract_address = (key === "AllContracts") ? null : key
    const stringifies =[...value.keys()]
    for(let i = 0; i<stringifies.length; i++){
      const { topics } = JSON.parse(stringifies[i])
      const startTime = evmLogDiscoveryMeta.lastObservedTimestamp 

      const rows = await getLogs(startTime, currentObservingTimestamp, contract_address, topics[0],topics[1], topics[2], topics[3]);
      // console.log("LOGS:",rows, "SUBSCRIBERS",value.get(stringifies[i]))

      // no async await.
      if(rows.length > 0){
        const subscribers_for_this_group_of_logs = Array.from(value.get(stringifies[i]));
        const requested_RPCs = IPPORT_BY_LOG_STRINGIFIED.get(stringifies[i])

        if(!requested_RPCs)continue

        for(const ipport of Array.from(requested_RPCs)){
          const ip = ipport.split("__")[0]
          const port = ipport.split("__")[1]
          axios.post(`http://${ip}:${port}` + "/webhook/evm_log", { 
            logs: rows, 
            subscribers: subscribers_for_this_group_of_logs  
          });
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
  topic3 = undefined,
) {
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
    console.log(sql, inputs);
    logs = await db.all(sql,inputs)
  } catch (e) {
    console.log(e)
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
