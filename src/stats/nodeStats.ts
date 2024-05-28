import * as db from './sqlite3storage'

export interface NodeStats {
  nodeAddress: string
  nominator: string
  nodeId: string
  currentState: string
  totalStandbyTime: number
  totalActiveTime: number
  totalSyncTime: number
  timestamp: number
}

export function isNodeStats(obj: NodeStats): obj is NodeStats {
  return obj.nodeAddress &&
    obj.nominator &&
    obj.nodeId &&
    obj.currentState &&
    obj.totalStandbyTime &&
    obj.totalActiveTime &&
    obj.timestamp
    ? true
    : false
}

export async function getNodeStatsByAddress(nodeAddress: string): Promise<NodeStats | null> {
  try {
    const sql = 'SELECT * FROM node_stats WHERE nodeAddress=? LIMIT 1'
    const nodeStats: NodeStats = await db.get(sql, [nodeAddress])
    if (nodeStats) {
      return nodeStats
    }
  } catch (e) {
    console.error(e)
  }
  return null
}

export async function getNodeStatsById(nodeId: string): Promise<NodeStats | null> {
  try {
    const sql = 'SELECT * FROM node_stats WHERE nodeId=? LIMIT 1'
    const nodeStats: NodeStats = await db.get(sql, [nodeId])
    if (nodeStats) {
      return nodeStats
    }
  } catch (e) {
    console.error(e)
  }
  return null
}

export async function insertOrUpdateNodeStats(nodeStats: NodeStats): Promise<void> {
  try {
    const fields = Object.keys(nodeStats).join(', ')
    const placeholders = Object.keys(nodeStats).fill('?').join(', ')
    const values = db.extractValues(nodeStats)
    const sql = 'INSERT OR REPLACE INTO node_stats (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
  } catch (e) {
    console.error(e)
    console.error('Unable to insert nodeStats in to database', nodeStats)
  }
}

export async function queryLatestNodeStats(limit = 100): Promise<NodeStats[]> {
  try {
    const sql = 'SELECT * FROM node_stats ORDER BY timestamp DESC LIMIT ?'
    const nodeStats: NodeStats[] = await db.all(sql, [limit])
    return nodeStats
  } catch (e) {
    console.error(e)
    console.error(`queryLatestNodeStats: failed to fetch latest node statistics`)
  }
  return []
}

export async function updateAllNodeStates(currCycleTimestamp: number): Promise<void> {
  try {
    const sql = `UPDATE node_stats
        SET currentState = 'removed',
            totalStandbyTime = CASE 
                                WHEN currentState IN ('standbyAdd', 'standbyRefresh') THEN totalStandbyTime + ${currCycleTimestamp} - timestamp
                                ELSE totalStandbyTime
                               END,
            totalSyncTime = CASE 
                               WHEN currentState = 'joinedConsensors' THEN totalSyncTime + ${currCycleTimestamp} - timestamp
                               ELSE totalSyncTime
                            END,
            totalActiveTime = CASE 
                               WHEN currentState = 'activated' THEN totalActiveTime + ${currCycleTimestamp} - timestamp
                               ELSE totalActiveTime
                            END,
            timestamp = ${currCycleTimestamp}
        WHERE currentState IN ('activated', 'standbyAdd', 'startedSyncing', 'standbyRefresh');`
    await db.all(sql)
  } catch (e) {
    console.error(e)
    console.error(`queryLatestNodeStats: failed to fetch latest node statistics`)
  }
}
