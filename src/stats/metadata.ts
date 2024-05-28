import * as db from './sqlite3storage'

export enum MetadataType {
  NodeStats = 'NodeStats',
}

export interface Metadata {
  type: string
  cycleNumber: number
}

export function isMetadata(obj: Metadata): obj is Metadata {
  return obj.type && obj.cycleNumber ? true : false
}

export async function insertOrUpdateMetadata(metadata: Metadata): Promise<void> {
  try {
    const fields = Object.keys(metadata).join(', ')
    const placeholders = Object.keys(metadata).fill('?').join(', ')
    const values = db.extractValues(metadata)
    const sql = 'INSERT OR REPLACE INTO metadata (' + fields + ') VALUES (' + placeholders + ')'
    await db.run(sql, values)
  } catch (e) {
    console.error(e)
    console.error(
      `Unable to insert or update metadata into the database for ${metadata.type}, cycleNumber:  ${metadata.cycleNumber}`
    )
  }
}

export async function getMetadata(type: MetadataType): Promise<Metadata | null> {
  try {
    const sql = 'SELECT * FROM metadata WHERE type=? LIMIT 1'
    const metadata: Metadata = await db.get(sql, [type])
    if (metadata) {
      return metadata
    }
  } catch (e) {
    console.error(e)
  }
  return null
}

export async function getLastStoredCycleNumber(type: MetadataType): Promise<number> {
  try {
    const metadata = await getMetadata(type)
    if (metadata) {
      return metadata.cycleNumber
    }
  } catch (e) {
    console.error(e)
  }
  return -1
}
