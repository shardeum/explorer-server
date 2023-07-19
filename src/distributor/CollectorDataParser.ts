import { Log, ArchivedReceipts, ReadableReceipt } from './types'

export const extractLogsFromReceipts = (archivedReceipts: ArchivedReceipts): Log[] => {
  // extract readableReceipt from archivedReceipts
  if (!archivedReceipts.receipts) return []
  const readableReceipts: ReadableReceipt[] = archivedReceipts.receipts
    .map((receipt) => receipt.receipt)
    .flat()

  // extract logs from readableReceipts
  const logs = readableReceipts
    .map((receipt) => {
      if ('readableReceipt' in receipt.data && receipt.data.readableReceipt?.logs)
        return receipt.data.readableReceipt.logs
    })
    .flat()
    .filter((log) => {
      if ('address' in log && 'topics' in log && 'data' in log) return true
    })

  return logs
}

export interface LogFilterOptions {
  address?: string
  topics?: string[]
}

export class IndexedLogs {
  LogMap: Map<string, Log> // Map of log ID to log
  AddressMap: Map<string, string[]> // Map of contract address to logs
  Topic0Map: Map<string, string[]> // Map of topic0 to logs
  Topic1Map: Map<string, string[]> // Map of topic1 to logs
  Topic2Map: Map<string, string[]> // Map of topic2 to logs
  Topic3Map: Map<string, string[]> // Map of topic3 to logs

  constructor(logs: Log[]) {
    this.LogMap = new Map<string, Log>()
    this.AddressMap = new Map<string, string[]>()
    this.Topic0Map = new Map<string, string[]>()
    this.Topic1Map = new Map<string, string[]>()
    this.Topic2Map = new Map<string, string[]>()
    this.Topic3Map = new Map<string, string[]>()

    for (let i = 0; i < logs.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const log = logs[i]
      const logId = i.toString()
      this.LogMap.set(logId, log)
      this.AddressMap.set(log.address, [...(this.AddressMap.get(log.address) || []), logId])
      this.Topic0Map.set(log.topics[0], [...(this.Topic0Map.get(log.topics[0]) || []), logId])
      this.Topic1Map.set(log.topics[1], [...(this.Topic1Map.get(log.topics[1]) || []), logId])
      this.Topic2Map.set(log.topics[2], [...(this.Topic2Map.get(log.topics[2]) || []), logId])
      this.Topic3Map.set(log.topics[3], [...(this.Topic3Map.get(log.topics[3]) || []), logId])
    }
  }

  filter(options: LogFilterOptions): Log[] {
    let logIds: string[] = []
    if (options.address) {
      logIds = [...(this.AddressMap.get(options.address) || [])]
    }
    if (options.topics) {
      if (options.topics.length == 1) {
        logIds = [...(this.Topic0Map.get(options.topics[0]) || [])]
      } else if (options.topics.length == 2) {
        const topic0FilterMatch = new Set(this.Topic0Map.get(options.topics[0]) || [])
        const topic1FilterMatch = new Set(this.Topic1Map.get(options.topics[1]) || [])
        logIds = intersectionOfSets([topic0FilterMatch, topic1FilterMatch])
      } else if (options.topics.length == 3) {
        const topic0FilterMatch = new Set(this.Topic0Map.get(options.topics[0]) || [])
        const topic1FilterMatch = new Set(this.Topic1Map.get(options.topics[1]) || [])
        const topic2FilterMatch = new Set(this.Topic2Map.get(options.topics[2]) || [])
        logIds = intersectionOfSets([topic0FilterMatch, topic1FilterMatch, topic2FilterMatch])
      } else if (options.topics.length == 4) {
        const topic0FilterMatch = new Set(this.Topic0Map.get(options.topics[0]) || [])
        const topic1FilterMatch = new Set(this.Topic1Map.get(options.topics[1]) || [])
        const topic2FilterMatch = new Set(this.Topic2Map.get(options.topics[2]) || [])
        const topic3FilterMatch = new Set(this.Topic2Map.get(options.topics[3]) || [])
        logIds = intersectionOfSets([
          topic0FilterMatch,
          topic1FilterMatch,
          topic2FilterMatch,
          topic3FilterMatch,
        ])
      }
    }

    // remove duplicate logIds
    logIds = [...new Set(logIds)]
    // sort the logIds
    logIds.sort((a, b) => parseInt(a) - parseInt(b))

    return logIds.map((logId) => this.LogMap.get(logId) as Log)
  }
}

const intersectionOfSets = <T>(sets: Set<T>[]): T[] => {
  if (sets.length === 0) {
    return []
  }

  // Sort the array by set size
  sets.sort((a, b) => a.size - b.size)

  // Start with the smallest set, and check for intersection with the other sets
  return [...sets[0]].filter((x) => sets.every((set) => set.has(x)))
}
