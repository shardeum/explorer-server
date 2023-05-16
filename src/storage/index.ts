import * as db from './sqlite3storage'

export const initializeDB = async () => {
  await db.init()
  await db.runCreate(
    'CREATE TABLE if not exists `archivedCycles` (`cycleMarker` TEXT NOT NULL UNIQUE PRIMARY KEY, `counter` NUMBER NOT NULL, `cycleRecord` JSON NOT NULL, `data` JSON, `receipt` JSON, `summary` JSON)'
  )
  await db.runCreate(
    'CREATE TABLE if not exists `cycles` (`cycleMarker` TEXT NOT NULL UNIQUE PRIMARY KEY, `counter` NUMBER NOT NULL, `cycleRecord` JSON NOT NULL)'
  )
  await db.runCreate('CREATE INDEX if not exists `cycles_idx` ON `cycles` (`counter` DESC)')
  await db.runCreate(
    'CREATE TABLE if not exists `accounts` (`accountId` TEXT NOT NULL UNIQUE PRIMARY KEY, `cycle` NUMBER NOT NULL, `timestamp` BIGINT NOT NULL, `ethAddress` TEXT NOT NULL, `account` TEXT NOT NULL, `hash` TEXT NOT NULL, `accountType` INTEGER NOT NULL, `contractInfo` JSON, `contractType` INTEGER)'
  )
  await db.runCreate(
    'CREATE INDEX if not exists `accounts_idx` ON `accounts` (`cycle` DESC, `timestamp` DESC, `accountType` ASC, `ethAddress`, `contractInfo`, `contractType` ASC)'
  )
  await db.runCreate(
    'CREATE TABLE if not exists `transactions` (`txId` TEXT NOT NULL, `result` JSON NOT NULL, `cycle` NUMBER NOT NULL, `partition` NUMBER, `timestamp` BIGINT NOT NULL, `wrappedEVMAccount` JSON NOT NULL, `accountId` TEXT NOT NULL,  `txFrom` TEXT NOT NULL, `txTo` TEXT NOT NULL, `nominee` TEXT, `txHash` TEXT NOT NULL, `transactionType` INTEGER NOT NULL, originTxData JSON, PRIMARY KEY (`txId`, `txHash`))'
  )
  await db.runCreate(
    'CREATE INDEX if not exists `transactions_idx` ON `transactions` (`cycle` DESC, `timestamp` DESC, `transactionType` DESC, `txId`, `txHash`, `txFrom`, `txTo`, `nominee`)'
  )
  await db.runCreate(
    'CREATE TABLE if not exists `tokenTxs` (`_id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `txId` TEXT, `txHash` TEXT NOT NULL, `cycle` NUMBER NOT NULL, `timestamp` BIGINT NOT NULL, `contractAddress` TEXT NOT NULL, `contractInfo` JSON, `tokenFrom` TEXT NOT NULL, `tokenTo` TEXT NOT NULL, `tokenValue` TEXT NOT NULL, `tokenType` INTEGER NOT NULL, `tokenEvent` TEXT NOT NULL, `tokenOperator` TEXT, `transactionFee` TEXT NOT NULL, FOREIGN KEY (`txId`, `txHash`) REFERENCES transactions(`txId`, `txHash`))'
  )
  await db.runCreate(
    'CREATE INDEX if not exists `tokenTxs_idx` ON `tokenTxs` (`cycle` DESC, `timestamp` DESC, `txId`, `txHash`, `contractAddress`, `tokenFrom`, `tokenTo`, `tokenType`, `tokenOperator`)'
  )
  await db.runCreate(
    'CREATE TABLE if not exists `tokens` (`ethAddress` TEXT NOT NULL, `contractAddress` TEXT NOT NULL, `tokenType` INTEGER NOT NULL, `tokenValue` TEXT NOT NULL, PRIMARY KEY (`ethAddress`, `contractAddress`))'
  )
  await db.runCreate(
    'CREATE INDEX if not exists `tokens_idx` ON `tokens` (`ethAddress`, `contractAddress`, `tokenType`, `tokenValue` DESC)'
  )
  await db.runCreate(
    'CREATE TABLE if not exists `logs` (`_id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `cycle` NUMBER NOT NULL, `timestamp` BIGINT NOT NULL, `txHash` TEXT NOT NULL,  `blockNumber` TEXT NOT NULL, `contractAddress` TEXT NOT NULL, `log` JSON NOT NULL, `topic0` TEXT NOT NULL, `topic1` TEXT, `topic2` TEXT, `topic3` TEXT)'
  )
  await db.runCreate(
    'CREATE INDEX if not exists `logs_idx` ON `logs` (`cycle` DESC, `timestamp` DESC, `txHash`, `blockNumber` DESC, `contractAddress`, `topic0`, `topic1`, `topic2`, `topic3`)'
  )
  await db.runCreate(
    'CREATE TABLE if not exists `receipts` (`receiptId` TEXT NOT NULL UNIQUE PRIMARY KEY, `tx` JSON NOT NULL, `cycle` NUMBER NOT NULL, `timestamp` BIGINT NOT NULL, `result` JSON NOT NULL, `accounts` JSON NOT NULL, `receipt` JSON, `sign` JSON NOT NULL)'
  )
  await db.runCreate('CREATE INDEX if not exists `receipts_idx` ON `receipts` (`cycle` ASC, `timestamp` ASC)')
}
