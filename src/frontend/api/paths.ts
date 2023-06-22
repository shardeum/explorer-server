// config variables
import { config as CONFIG } from '../../config'

const port = process.argv[2]
if (port && Number.isInteger(Number(port))) {
  CONFIG.port.server = port
}
let BASE_URL = `http://${CONFIG.host}:${CONFIG.port.server}`

if (CONFIG.apiUrl != '') BASE_URL = CONFIG.apiUrl

console.log('BASE_URL', BASE_URL)

export const PATHS = {
  BASE_URL,
  TOTAL_DATA: BASE_URL + '/totalData',
  TRANSACTION: BASE_URL + '/api/transaction',
  TRANSACTION_DETAIL: BASE_URL + '/api/transaction',
  RECEIPT_DETAIL: BASE_URL + '/api/receipt',
  CYCLE: BASE_URL + '/api/cycleinfo',
  ACCOUNT: BASE_URL + '/api/account',
  ADDRESS: BASE_URL + '/api/address',
  TOKEN: BASE_URL + '/api/token',
  LOG: BASE_URL + '/api/log',
  STATS_VALIDATOR: BASE_URL + '/api/stats/validator',
  STATS_TRANSACTION: BASE_URL + '/api/stats/transaction',
  STATS_COIN: BASE_URL + '/api/stats/coin',
}
