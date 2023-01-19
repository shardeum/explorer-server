const BASE_URL = process.env.BASE_URL;

// const BASE_URL = "https://explorer-liberty20.shardeum.org";

export const PATHS = {
  BASE_URL,
  TOTAL_DATA: BASE_URL + "/totalData",
  TRANSACTION: BASE_URL + "/api/transaction",
  TRANSACTION_DETAIL: BASE_URL + "/api/tx",
  CYCLE: BASE_URL + "/api/cycleinfo",
  ACCOUNT: BASE_URL + "/api/account",
  ADDRESS: BASE_URL + "/api/address",
  TOKEN: BASE_URL + "/api/token",
  LOG: BASE_URL + "/api/log",
};
