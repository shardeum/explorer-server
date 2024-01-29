import * as db from './sqlite3storage'

export const initializeStatsDB = async (): Promise<void> => {
  await db.init()
  await db.runCreate(
    'CREATE TABLE if not exists `validators` (`cycle` NUMBER NOT NULL UNIQUE PRIMARY KEY, `active` NUMBER NOT NULL, `activated` NUMBER NOT NULL, `syncing` NUMBER NOT NULL, `joined` NUMBER NOT NULL, `removed` NUMBER NOT NULL, `apoped` NUMBER NOT NULL, `timestamp` BIGINT NOT NULL)'
  )
  // await db.runCreate('Drop INDEX if exists `validators_idx`');
  await db.runCreate(
    'CREATE INDEX if not exists `validators_idx` ON `validators` (`cycle` DESC, `timestamp` DESC)'
  )
  await db.runCreate(`
    CREATE TABLE if not exists transactions (
      cycle NUMBER NOT NULL UNIQUE PRIMARY KEY, 
      totalTxs NUMBER NOT NULL, 
      totalInternalTxs NUMBER NOT NULL, 
      totalStakeTxs NUMBER NOT NULL, 
      totalUnstakeTxs NUMBER NOT NULL, 
      totalSetGlobalCodeBytesTxs NUMBER NOT NULL DEFAULT 0, 
      totalInitNetworkTxs NUMBER NOT NULL DEFAULT 0, 
      totalNodeRewardTxs NUMBER NOT NULL DEFAULT 0, 
      totalChangeConfigTxs NUMBER NOT NULL DEFAULT 0, 
      totalApplyChangeConfigTxs NUMBER NOT NULL DEFAULT 0, 
      totalSetCertTimeTxs NUMBER NOT NULL DEFAULT 0, 
      totalInitRewardTimesTxs NUMBER NOT NULL DEFAULT 0, 
      totalClaimRewardTxs NUMBER NOT NULL DEFAULT 0, 
      totalChangeNetworkParamTxs NUMBER NOT NULL DEFAULT 0, 
      totalApplyNetworkParamTxs NUMBER NOT NULL DEFAULT 0, 
      totalPenaltyTxs NUMBER NOT NULL DEFAULT 0, 
      timestamp BIGINT NOT NULL
    )`)

  // await db.runCreate('Drop INDEX if exists `transactions_idx`');
  await db.runCreate(
    'CREATE INDEX if not exists `transactions_idx` ON `transactions` (`cycle` DESC, `timestamp` DESC)'
  )

  await db.runCreate(
    'CREATE TABLE if not exists `coin_stats` (`cycle` NUMBER NOT NULL UNIQUE PRIMARY KEY, `totalSupplyChange` BIGINT NOT NULL, `totalStakeChange` BIGINT NOT NULL, `timestamp` BIGINT NOT NULL)'
  )
  // await db.runCreate('Drop INDEX if exists `coin_stats_idx`');
  await db.runCreate(
    'CREATE INDEX if not exists `coin_stats_idx` ON `coin_stats` (`cycle` DESC, `timestamp` DESC)'
  )
}
