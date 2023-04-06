// const BASE_URL = process.env.BASE_URL

// config variables
import { config as CONFIG } from '../../config'
if (process.env.PORT) {
  CONFIG.port.server = process.env.PORT
}

console.log(process.argv)
const port = process.argv[2]
if (port) {
  CONFIG.port.server = port
}
console.log('Port', CONFIG.port.server)
const BASE_URL = `http://localhost:${CONFIG.port.server}`

export const PATHS = {
  BASE_URL,
  TOTAL_DATA: BASE_URL + '/totalData',
  TRANSACTION: BASE_URL + '/api/transaction',
  TRANSACTION_DETAIL: BASE_URL + '/api/tx',
  CYCLE: BASE_URL + '/api/cycleinfo',
  ACCOUNT: BASE_URL + '/api/account',
  ADDRESS: BASE_URL + '/api/address',
  TOKEN: BASE_URL + '/api/token',
  LOG: BASE_URL + '/api/log',
  STATS_VALIDATOR: BASE_URL + '/api/stats/validator',
  STATS_TRANSACTION: BASE_URL + '/api/stats/transaction',
  STATS_COIN: BASE_URL + '/api/stats/coin',
}
