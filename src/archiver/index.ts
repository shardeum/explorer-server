import { setupArchiverDiscovery, getArchiverList, getFinalArchiverList } from '@shardus/archiver-discovery'
import { ARCHIVER_INFO, config } from '../config'


//archiver discovery will remove possible duplication of archiver info
process.env['ARCHIVER_INFO'] = process.env['ARCHIVER_INFO']
  ? `${process.env['ARCHIVER_INFO']},${ARCHIVER_INFO}`
  : ARCHIVER_INFO

console.log('Starting archiver discovery')

setupArchiverDiscovery({
  customConfigPath: 'archiverConfig.json',
})

//used to perform requests using the same archiver
let defaultArchiverUrl = null

export async function getDefaultArchiverUrl() {
  if (defaultArchiverUrl) {
    return defaultArchiverUrl
  }
  console.log('Getting default archiver url')
  const archivers = await getFinalArchiverList()

  // this defeats the purpose of archiver discovery but is needed for now
  // because the collector and data-patcher services use the functions from it to sync data. which is also why they should have to use the same archiver.
  const archiver = archivers.find((a) => a.publicKey === config.archiverInfo.publicKey)
  if (!archiver) {
    throw new Error('Default archiver not found')
  }

  defaultArchiverUrl = `http://${archiver.ip}:${archiver.port}`
  return defaultArchiverUrl
}
