import { queryLogsBetweenCycles } from "../storage/log";

export interface LogSubscription{
  subscription_id: string;
  address: string | string[]; 
  topics: string[];
}
export const LOG_SUBSCRIPTIONS = new Map<string,LogSubscription[]>();

export const currLogDiscoveringCycle = 0
export async function evmLogDiscovery() {
  // discover log
}
