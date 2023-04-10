import * as CoinStats from '../stats/coinStats'
import * as TransactionStats from '../stats/transactionStats'
import * as ValidatorStats from '../stats/validatorStats'
import * as Cycle from '../storage/cycle'
import * as Transaction from '../storage/transaction'
import { TransactionSearchType, TransactionType } from '../@type'
import BN from 'bn.js'
import BigNumber from 'decimal.js'

export const insertValidatorStats = async (cycleRecord) => {
  const validatorsInfo: ValidatorStats.ValidatorStats = {
    cycle: cycleRecord.counter,
    active: cycleRecord.active,
    timestamp: cycleRecord.start,
  }
  await ValidatorStats.insertValidatorStats(validatorsInfo)
}

export const recordOldValidatorsStats = async (latestCycle: number, lastStoredCycle: number) => {
  let combineValidatorsStats: ValidatorStats.ValidatorStats[] = []
  let bucketSize = 100
  let startCycle = lastStoredCycle + 1
  let endCycle = startCycle + bucketSize
  while (startCycle <= latestCycle) {
    if (endCycle > latestCycle) endCycle = latestCycle
    const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
    if (cycles.length > 0) {
      for (let j = 0; j < cycles.length; j++) {
        combineValidatorsStats.push({
          cycle: cycles[j].counter,
          active: cycles[j].cycleRecord.active,
          timestamp: cycles[j].cycleRecord.start,
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

export const recordTransactionsStats = async (latestCycle: number, lastStoredCycle: number) => {
  let combineTransactionStats: TransactionStats.TransactionStats[] = []
  let bucketSize = 50
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
      for (let j = 0; j < cycles.length; j++) {
        const txsCycle = transactions.filter((a) => a.cycle === cycles[j].counter)
        const stakeTxsCycle = stakeTransactions.filter((a) => a.cycle === cycles[j].counter)
        const unstakeTxsCycle = unstakeTransactions.filter((a) => a.cycle === cycles[j].counter)
        combineTransactionStats.push({
          cycle: cycles[j].counter,
          totalTxs: txsCycle.length > 0 ? txsCycle[0].transactions : 0,
          totalStakeTxs: stakeTxsCycle.length > 0 ? stakeTxsCycle[0].transactions : 0,
          totalUnstakeTxs: unstakeTxsCycle.length > 0 ? unstakeTxsCycle[0].transactions : 0,
          timestamp: cycles[j].cycleRecord.start,
        })
      }
      // console.log('combineTransactionStats', combineTransactionStats)
      await TransactionStats.bulkInsertTransactionsStats(combineTransactionStats)
      combineTransactionStats = []
    } else {
      console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
    }
    startCycle = endCycle + 1
    endCycle = endCycle + bucketSize
  }
}

export const recordCoinStats = async (latestCycle: number, lastStoredCycle: number) => {
  let bucketSize = 50
  let startCycle = lastStoredCycle + 1
  let endCycle = startCycle + bucketSize
  while (startCycle <= latestCycle) {
    if (endCycle > latestCycle) endCycle = latestCycle
    const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
    if (cycles.length > 0) {
      let combineCoinStats: CoinStats.CoinStats[] = []
      for (let i = 0; i < cycles.length; i++) {
        // Fetch transactions
        const transactions = await Transaction.queryTransactionsForCycle(cycles[i].counter)

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
              current.wrappedEVMAccount.readableReceipt &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo.stakeAmount
            ) {
              const stakeAmountBN = new BN(
                current.wrappedEVMAccount.readableReceipt.stakeInfo.stakeAmount,
                10
              )
              return sum.add(stakeAmountBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total unstaked amount in cycle
          const unStakeAmount = unstakeTransactions.reduce((sum, current) => {
            if (
              current.wrappedEVMAccount.readableReceipt &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo.stake
            ) {
              const unStakeAmountBN = new BN(current.wrappedEVMAccount.readableReceipt.stakeInfo.stake, 16)
              return sum.add(unStakeAmountBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total node rewards in cycle
          const nodeRewardAmount = unstakeTransactions.reduce((sum, current) => {
            if (
              current.wrappedEVMAccount.readableReceipt &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo.reward
            ) {
              const rewardBN = new BN(current.wrappedEVMAccount.readableReceipt.stakeInfo.reward, 16)
              return sum.add(rewardBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total reward penalties in cycle
          const nodePenaltyAmount = unstakeTransactions.reduce((sum, current) => {
            if (
              current.wrappedEVMAccount.readableReceipt &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo &&
              current.wrappedEVMAccount.readableReceipt.stakeInfo.penalty
            ) {
              const penaltyBN = new BN(current.wrappedEVMAccount.readableReceipt.stakeInfo.penalty, 16)
              return sum.add(penaltyBN)
            } else {
              return sum
            }
          }, new BN(0))
          // Calculate total gas burnt in cycle
          const gasBurnt = transactions.reduce((sum, current) => {
            if (current.wrappedEVMAccount.amountSpent) {
              const amountSpentBN = new BN(current.wrappedEVMAccount.amountSpent, 10)
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
            cycle: cycles[i].counter,
            totalSupplyChange: weiBNToEth(nodeRewardAmount.sub(nodePenaltyAmount).sub(gasBurnt)),
            totalStakeChange: weiBNToEth(stakeAmount.sub(unStakeAmount)),
            timestamp: cycles[i].cycleRecord.start,
          }
          // await CoinStats.insertCoinStats(coinStatsForCycle)
          combineCoinStats.push(coinStatsForCycle)
        } catch (e) {
          console.log(`Failed to record coin stats for cycle ${cycles[i].counter}`, e)
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

export const patchStatsBetweenCycles = async (startCycle: number, endCycle: number) => {
  await recordOldValidatorsStats(endCycle, startCycle - 1)
  await recordTransactionsStats(endCycle, startCycle - 1)
  await recordCoinStats(endCycle, startCycle - 1)
}
