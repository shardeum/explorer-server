import { Log } from 'web3-core'
import { ArchivedReceipts, ReadableReceipt } from './types'

export const extractLogsFromReceipts = (archivedReceipts: ArchivedReceipts): Log[] => {
  // extract readableReceipt from archivedReceipts
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

  constructor(logs: Log[]) {
    for (let i = 0; i < logs.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const log = logs[i]
      const logId = i.toString()
      this.LogMap.set(logId, log)
      this.AddressMap.set(log.address, [...(this.AddressMap.get(log.address) || []), logId])
      this.Topic0Map.set(log.topics[0], [...(this.Topic0Map.get(log.topics[0]) || []), logId])
      this.Topic1Map.set(log.topics[1], [...(this.Topic1Map.get(log.topics[1]) || []), logId])
      this.Topic2Map.set(log.topics[2], [...(this.Topic2Map.get(log.topics[2]) || []), logId])
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
        logIds = [
          ...(this.Topic0Map.get(options.topics[0]) || []),
          ...(this.Topic1Map.get(options.topics[1]) || []),
        ]
      } else if (options.topics.length == 3) {
        logIds = [
          ...(this.Topic0Map.get(options.topics[0]) || []),
          ...(this.Topic1Map.get(options.topics[1]) || []),
          ...(this.Topic2Map.get(options.topics[2]) || []),
        ]
      }
    }

    // remove duplicate logIds
    logIds = [...new Set(logIds)]
    // sort the logIds
    logIds.sort((a, b) => parseInt(a) - parseInt(b))

    return logIds.map((logId) => this.LogMap.get(logId) as Log)
  }
}
