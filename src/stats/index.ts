import * as db from './sqlite3storage'

export const initializeStatsDB = async () => {
  await db.init()
  await db.runCreate(
    'CREATE TABLE if not exists `validators` (`cycle` NUMBER NOT NULL UNIQUE PRIMARY KEY, `active` NUMBER NOT NULL, `activated` NUMBER NOT NULL, `syncing` NUMBER NOT NULL, `joined` NUMBER NOT NULL, `removed` NUMBER NOT NULL, `apoped` NUMBER NOT NULL, `timestamp` BIGINT NOT NULL)'
  )
  // await db.runCreate('Drop INDEX if exists `validators_idx`');
  await db.runCreate('CREATE INDEX if not exists `validators_idx` ON `validators` (`timestamp` DESC)')
  await db.runCreate(
    'CREATE TABLE if not exists `transactions` (`cycle` NUMBER NOT NULL UNIQUE PRIMARY KEY, `totalTxs` NUMBER NOT NULL, `totalStakeTxs` NUMBER NOT NULL, `totalUnstakeTxs` NUMBER NOT NULL, `timestamp` BIGINT NOT NULL)'
  )
  // await db.runCreate('Drop INDEX if exists `transactions_idx`');
  await db.runCreate('CREATE INDEX if not exists `transactions_idx` ON `transactions` (`timestamp` DESC)')

  await db.runCreate(
    'CREATE TABLE if not exists `coin_stats` (`cycle` NUMBER NOT NULL UNIQUE PRIMARY KEY, `totalSupplyChange` BIGINT NOT NULL, `totalStakeChange` BIGINT NOT NULL, `timestamp` BIGINT NOT NULL)'
  )

  await db.runCreate(
    'CREATE INDEX if not exists `coin_stats_totalSupplyChange` ON `coin_stats` (`totalSupplyChange`)'
  )
  await db.runCreate(
    'CREATE INDEX if not exists `coin_stats_totalStakeChange` ON `coin_stats` (`totalStakeChange`)'
  )
}
