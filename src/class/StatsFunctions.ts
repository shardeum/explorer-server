import * as CoinStats from '../stats/coinStats'
import * as TransactionStats from '../stats/transactionStats'
import * as ValidatorStats from '../stats/validatorStats'
import * as Cycle from '../storage/cycle'
import * as Transaction from '../storage/transaction'
import { InternalTXType, TransactionSearchType, TransactionType } from '../types'
import BN from 'bn.js'
import BigNumber from 'decimal.js'
import { CycleRecord } from '@shardus/types/build/src/p2p/CycleCreatorTypes'
import { config } from '../config/index'

export const insertValidatorStats = async (cycleRecord: CycleRecord): Promise<void> => {
  const validatorsInfo: ValidatorStats.ValidatorStats = {
    cycle: cycleRecord.counter,
    active: cycleRecord.active,
    activated: cycleRecord.activated.length,
    syncing: cycleRecord.syncing,
    joined: cycleRecord.joinedConsensors.length,
    removed: cycleRecord.removed.length,
    apoped: cycleRecord.apoptosized.length,
    timestamp: cycleRecord.start,
  }
  await ValidatorStats.insertValidatorStats(validatorsInfo)
}

export const recordOldValidatorsStats = async (
  latestCycle: number,
  lastStoredCycle: number
): Promise<void> => {
  let combineValidatorsStats: ValidatorStats.ValidatorStats[] = []
  const bucketSize = 100
  let startCycle = lastStoredCycle + 1
  let endCycle = startCycle + bucketSize
  while (startCycle <= latestCycle) {
    if (endCycle > latestCycle) endCycle = latestCycle
    const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        combineValidatorsStats.push({
          cycle: cycle.counter,
          active: cycle.cycleRecord.active,
          activated: cycle.cycleRecord.activated.length,
          syncing: cycle.cycleRecord.syncing,
          joined: cycle.cycleRecord.joinedConsensors.length,
          removed: cycle.cycleRecord.removed.length,
          apoped: cycle.cycleRecord.apoptosized.length,
          timestamp: cycle.cycleRecord.start,
        })
      }
      await ValidatorStats.bulkInsertValidatorsStats(combineValidatorsStats)
      combineValidatorsStats = []
    } else {
      console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
    }
    startCycle = endCycle + 1
    endCycle = endCycle + bucketSize
  }
}

export const recordTransactionsStats = async (
  latestCycle: number,
  lastStoredCycle: number
): Promise<void> => {
  let combineTransactionStats: TransactionStats.TransactionStats[] = []
  const bucketSize = 50
  let startCycle = lastStoredCycle + 1
  let endCycle = startCycle + bucketSize
  while (startCycle <= latestCycle) {
    if (endCycle > latestCycle) endCycle = latestCycle
    const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
    if (cycles.length > 0) {
      const transactions = await Transaction.queryTransactionCountByCycles(startCycle, endCycle)
      const stakeTransactions = await Transaction.queryTransactionCountByCycles(
        startCycle,
        endCycle,
        TransactionSearchType.StakeReceipt
      )
      const unstakeTransactions = await Transaction.queryTransactionCountByCycles(
        startCycle,
        endCycle,
        TransactionSearchType.UnstakeReceipt
      )

      const internalTransactions = await Transaction.queryTransactionCountByCycles(
        startCycle,
        endCycle,
        TransactionSearchType.InternalTxReceipt
      )
      const granularInternalTransactions = await Transaction.queryInternalTransactionCountByCycles(
        startCycle,
        endCycle
      )
      for (const cycle of cycles) {
        const txsCycle = transactions.filter((a: { cycle: number }) => a.cycle === cycle.counter)
        const internalTxsCycle = internalTransactions.filter(
          (a: { cycle: number }) => a.cycle === cycle.counter
        )
        const stakeTxsCycle = stakeTransactions.filter((a: { cycle: number }) => a.cycle === cycle.counter)
        const unstakeTxsCycle = unstakeTransactions.filter(
          (a: { cycle: number }) => a.cycle === cycle.counter
        )

        const granularInternalTxCounts = {
          totalSetGlobalCodeBytesTxs: 0,
          totalInitNetworkTxs: 0,
          totalNodeRewardTxs: 0,
          totalChangeConfigTxs: 0,
          totalApplyChangeConfigTxs: 0,
          totalSetCertTimeTxs: 0,
          totalStakeTxs: 0,
          totalUnstakeTxs: 0,
          totalInitRewardTimesTxs: 0,
          totalClaimRewardTxs: 0,
          totalChangeNetworkParamTxs: 0,
          totalApplyNetworkParamTxs: 0,
          totalPenaltyTxs: 0,
        }

        granularInternalTransactions
          .filter(({ cycle: c }) => c === cycle.counter)
          .forEach(({ internalTXType, count }) => {
            switch (internalTXType) {
              case InternalTXType.SetGlobalCodeBytes:
                granularInternalTxCounts.totalSetGlobalCodeBytesTxs += count
                break
              case InternalTXType.InitNetwork:
                granularInternalTxCounts.totalInitNetworkTxs += count
                break
              case InternalTXType.NodeReward:
                granularInternalTxCounts.totalNodeRewardTxs += count
                break
              case InternalTXType.ChangeConfig:
                granularInternalTxCounts.totalChangeConfigTxs += count
                break
              case InternalTXType.ApplyChangeConfig:
                granularInternalTxCounts.totalApplyChangeConfigTxs += count
                break
              case InternalTXType.SetCertTime:
                granularInternalTxCounts.totalSetCertTimeTxs += count
                break
              case InternalTXType.Stake:
                granularInternalTxCounts.totalStakeTxs += count
                break
              case InternalTXType.Unstake:
                granularInternalTxCounts.totalUnstakeTxs += count
                break
              case InternalTXType.InitRewardTimes:
                granularInternalTxCounts.totalInitRewardTimesTxs += count
                break
              case InternalTXType.ClaimReward:
                granularInternalTxCounts.totalClaimRewardTxs += count
                break
              case InternalTXType.ChangeNetworkParam:
                granularInternalTxCounts.totalChangeNetworkParamTxs += count
                break
              case InternalTXType.ApplyNetworkParam:
                granularInternalTxCounts.totalApplyNetworkParamTxs += count
                break
              case InternalTXType.Penalty:
                granularInternalTxCounts.totalPenaltyTxs += count
                break
            }
          })

        combineTransactionStats.push({
          cycle: cycle.counter,
          totalTxs: txsCycle.length > 0 ? txsCycle[0].transactions : 0,
          totalInternalTxs: internalTxsCycle.length > 0 ? internalTxsCycle[0].transactions : 0,
          totalStakeTxs: stakeTxsCycle.length > 0 ? stakeTxsCycle[0].transactions : 0,
          totalUnstakeTxs: unstakeTxsCycle.length > 0 ? unstakeTxsCycle[0].transactions : 0,
          ...granularInternalTxCounts,
          timestamp: cycle.cycleRecord.start,
        })
      }
      /* prettier-ignore */ if (config.verbose)  console.log('combineTransactionStats', combineTransactionStats)
      await TransactionStats.bulkInsertTransactionsStats(combineTransactionStats)
      combineTransactionStats = []
    } else {
      console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
    }
    startCycle = endCycle + 1
    endCycle = endCycle + bucketSize
  }
}

export const recordCoinStats = async (latestCycle: number, lastStoredCycle: number): Promise<void> => {
  const bucketSize = 50
  let startCycle = lastStoredCycle + 1
  let endCycle = startCycle + bucketSize
  while (startCycle <= latestCycle) {
    if (endCycle > latestCycle) endCycle = latestCycle
    const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
    if (cycles.length > 0) {
      let combineCoinStats: CoinStats.CoinStats[] = []
      for (const cycle of cycles) {
        // Fetch transactions
        const transactions = await Transaction.queryTransactionsForCycle(cycle.counter)

        // Filter transactions
        const stakeTransactions = transactions.filter(
          (a) => a.transactionType === TransactionType.StakeReceipt
        )
        const unstakeTransactions = transactions.filter(
          (a) => a.transactionType === TransactionType.UnstakeReceipt
        )

        try {
          // Calculate total staked amount in cycle
          const stakeAmount = stakeTransactions.reduce((sum, current) => {
            if (
              'readableReceipt' in current.wrappedEVMAccount &&
              current.wrappedEVMAccount.readableReceipt?.stakeInfo?.stake
            ) {
              const stakeAmountBN = new BN(current.wrappedEVMAccount.readableReceipt.stakeInfo.stake.toString())
              return sum.add(stakeAmountBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total unstaked amount in cycle
          const unStakeAmount = unstakeTransactions.reduce((sum, current) => {
            if (
              'readableReceipt' in current.wrappedEVMAccount &&
              current.wrappedEVMAccount.readableReceipt?.stakeInfo?.stake
            ) {
              const unStakeAmountBN = new BN(current.wrappedEVMAccount.readableReceipt.stakeInfo.stake.toString())
              return sum.add(unStakeAmountBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total node rewards in cycle
          const nodeRewardAmount = unstakeTransactions.reduce((sum, current) => {
            if (
              'readableReceipt' in current.wrappedEVMAccount &&
              current.wrappedEVMAccount.readableReceipt?.stakeInfo?.reward
            ) {
              const rewardBN = new BN(current.wrappedEVMAccount.readableReceipt.stakeInfo.reward.toString())
              return sum.add(rewardBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total reward penalties in cycle
          const nodePenaltyAmount = unstakeTransactions.reduce((sum, current) => {
            if (
              'readableReceipt' in current.wrappedEVMAccount &&
              current.wrappedEVMAccount.readableReceipt?.stakeInfo?.penalty
            ) {
              const penaltyBN = new BN(current.wrappedEVMAccount.readableReceipt.stakeInfo.penalty.toString())
              return sum.add(penaltyBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total gas burnt in cycle
          const gasBurnt = transactions.reduce((sum, current) => {
            if ('amountSpent' in current.wrappedEVMAccount && current.wrappedEVMAccount.amountSpent) {
              // remove prefix 0x from amountSpent hex string
              const amountSpentBN = new BN(current.wrappedEVMAccount.amountSpent.substring(2), 16)
              return sum.add(amountSpentBN)
            } else {
              return sum
            }
          }, new BN(0))

          const weiBNToEth = (bn: BN): number => {
            let stringVal = ''
            if (bn.isNeg()) {
              stringVal = `-${bn.neg().toString()}`
            } else {
              stringVal = bn.toString()
            }
            const result = new BigNumber(stringVal).div('1e18')
            return result.toNumber()
          }

          const coinStatsForCycle = {
            cycle: cycle.counter,
            totalSupplyChange: weiBNToEth(nodeRewardAmount.sub(nodePenaltyAmount).sub(gasBurnt)),
            totalStakeChange: weiBNToEth(stakeAmount.sub(unStakeAmount)),
            timestamp: cycle.cycleRecord.start,
          }
          // await CoinStats.insertCoinStats(coinStatsForCycle)
          combineCoinStats.push(coinStatsForCycle)
        } catch (e) {
          console.log(`Failed to record coin stats for cycle ${cycle.counter}`, e)
        }
      }
      await CoinStats.bulkInsertCoinsStats(combineCoinStats)
      combineCoinStats = []
    } else {
      console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
    }
    startCycle = endCycle + 1
    endCycle = endCycle + bucketSize
  }
}

export const patchStatsBetweenCycles = async (startCycle: number, endCycle: number): Promise<void> => {
  await recordOldValidatorsStats(endCycle, startCycle - 1)
  await recordTransactionsStats(endCycle, startCycle - 1)
  await recordCoinStats(endCycle, startCycle - 1)
}
