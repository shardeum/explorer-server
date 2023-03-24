// require("dotenv").config();

import * as crypto from "@shardus/crypto-utils";
import cron from 'node-cron';
import * as StatsStorage from './stats';
import * as CoinStats from './stats/coinStats';
import * as TransactionStats from './stats/transactionStats';
import * as ValidatorStats from './stats/validatorStats';
import * as Storage from "./storage";
import * as Cycle from "./storage/cycle";
import * as Transaction from "./storage/transaction";


crypto.init("69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc");

// config variables
import { TransactionSearchType, TransactionType } from "./@type";
import { config as CONFIG } from "./config";
import { BN } from "bn.js";
if (process.env.PORT) {
    CONFIG.port.server = process.env.PORT;
}

const measure_time = false;
let start_time;


const start = async () => {
    await Storage.initializeDB();

    await StatsStorage.initializeStatsDB()
    let lastCheckedCycleForValidators = 0
    let lastCheckedCycleForTxs = 0
    let lastCheckedCycleForCoinStats = 0
    let waitCycleForStats = 5 // Calculate transactions count per Cycle after 5 cycles

    let lastStoredValidators = await ValidatorStats.queryLatestValidatorStats(1)
    if (lastStoredValidators.length > 0) lastCheckedCycleForValidators = lastStoredValidators[0].cycle

    let lastStoredTransactions = await TransactionStats.queryLatestTransactionStats(1)
    if (lastStoredTransactions.length > 0) lastCheckedCycleForTxs = lastStoredTransactions[0].cycle

    let lastStoredCoinStats = await CoinStats.queryLatestCoinStats(1)
    if (lastStoredCoinStats.length > 0) lastCheckedCycleForTxs = lastStoredCoinStats[0].cycle

    console.log('lastCheckedCycleForValidators', lastCheckedCycleForValidators)
    if (measure_time)
        start_time = process.hrtime();
    cron.schedule('* * * * *', async () => {
        console.log('Running cron task....');
        if (measure_time && start_time) {
            var end_time = process.hrtime(start_time);
            console.log('End Time', end_time)
            start_time = process.hrtime();
        }
        let latestCycleRecord = await Cycle.queryLatestCycleRecords(1)
        let latestCycleCounter = latestCycleRecord.length > 0 ? latestCycleRecord[0].counter : 0
        console.log('latestCycleCounter', latestCycleCounter)
        if (latestCycleCounter > lastCheckedCycleForValidators) {
            if (latestCycleCounter - lastCheckedCycleForValidators === 1)
                await insertValidatorStats(latestCycleRecord[0].cycleRecord)
            else recordOldValidatorsStats(latestCycleCounter, lastCheckedCycleForValidators)
            lastCheckedCycleForValidators = latestCycleCounter
        }
        // console.log(latestCycleCounter - waitCycleForTxs, lastCheckedCycleForTxs)
        if (latestCycleCounter - waitCycleForStats > lastCheckedCycleForTxs) {
            recordTransactionsStats(latestCycleCounter - waitCycleForStats, lastCheckedCycleForTxs)
            lastCheckedCycleForTxs = latestCycleCounter - waitCycleForStats
        }

        if (latestCycleCounter - waitCycleForStats > lastCheckedCycleForCoinStats) {
            recordCoinStats(latestCycleCounter - waitCycleForStats, lastCheckedCycleForCoinStats)
            lastCheckedCycleForCoinStats = latestCycleCounter - waitCycleForStats
        }
    });

};

start();

const insertValidatorStats = async (cycleRecord) => {
    const validatorsInfo: ValidatorStats.ValidatorStats = {
        'cycle': cycleRecord.counter,
        'active': cycleRecord.active,
        'timestamp': cycleRecord.start
    }
    await ValidatorStats.insertValidatorStats(validatorsInfo)
}

const recordOldValidatorsStats = async (latestCycle: number, lastStoredCycle: number) => {
    let combineValidatorsStats: ValidatorStats.ValidatorStats[] = []
    let bucketSize = 100
    let startCycle = lastStoredCycle + 1;
    let endCycle = startCycle + bucketSize;
    while (startCycle <= latestCycle) {
        if (endCycle > latestCycle) endCycle = latestCycle
        const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
        if (cycles.length > 0) {
            for (let j = 0; j < cycles.length; j++) {
                combineValidatorsStats.push({
                    'cycle': cycles[j].counter,
                    'active': cycles[j].cycleRecord.active,
                    'timestamp': cycles[j].cycleRecord.start
                })
            }
            await ValidatorStats.bulkInsertValidatorsStats(combineValidatorsStats)
            combineValidatorsStats = []
        } else {
            console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
        }
        startCycle = endCycle + 1
        endCycle = startCycle + bucketSize;
    }

}

const recordTransactionsStats = async (latestCycle: number, lastStoredCycle: number) => {
    let combineTransactionStats: TransactionStats.TransactionStats[] = []
    let bucketSize = 50
    let startCycle = lastStoredCycle + 1;
    let endCycle = startCycle + bucketSize;
    while (startCycle <= latestCycle) {
        if (endCycle > latestCycle) endCycle = latestCycle
        const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
        if (cycles.length > 0) {
            const transactions = await Transaction.queryTransactionCountByCycles(startCycle, endCycle)
            const stakeTransactions = await Transaction.queryTransactionCountByCycles(startCycle, endCycle, TransactionSearchType.StakeReceipt)
            const unstakeTransactions = await Transaction.queryTransactionCountByCycles(startCycle, endCycle, TransactionSearchType.UnstakeReceipt)
            for (let j = 0; j < cycles.length; j++) {
                const txsCycle = transactions.filter(a => a.cycle === cycles[j].counter)
                const stakeTxsCycle = stakeTransactions.filter(a => a.cycle === cycles[j].counter)
                const unstakeTxsCycle = unstakeTransactions.filter(a => a.cycle === cycles[j].counter)
                combineTransactionStats.push({
                    'cycle': cycles[j].counter,
                    'totalTxs': txsCycle.length > 0 ? txsCycle[0].transactions : 0,
                    'totalStakeTxs': stakeTxsCycle.length > 0 ? stakeTxsCycle[0].transactions : 0,
                    'totalUnstakeTxs': unstakeTxsCycle.length > 0 ? unstakeTxsCycle[0].transactions : 0,
                    'timestamp': cycles[j].cycleRecord.start,
                })
            }
            // console.log('combineTransactionStats', combineTransactionStats)
            await TransactionStats.bulkInsertTransactionsStats(combineTransactionStats)
            combineTransactionStats = []
        } else {
            console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
        }
        startCycle = endCycle + 1
        endCycle = startCycle + bucketSize;
    }
}

const recordCoinStats = async (latestCycle: number, lastStoredCycle: number) => {
  let bucketSize = 50
  let startCycle = lastStoredCycle + 1
  let endCycle = startCycle + bucketSize
  while (startCycle <= latestCycle) {
    if (endCycle > latestCycle) endCycle = latestCycle
    const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
    if (cycles.length > 0) {
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

          const coinStatsForCycle = {
            cycle: cycles[i].counter,
            totalSupplyChange: nodeRewardAmount
              .sub(nodePenaltyAmount)
              .sub(gasBurnt)
              .div(new BN(10).pow(new BN(18)))
              .toNumber(),
            totalStakeChange: stakeAmount.sub(unStakeAmount).div(new BN(10).pow(new BN(18))).toNumber(),
            timestamp: cycles[i].cycleRecord.start,
          }
          await CoinStats.insertCoinStats(coinStatsForCycle)
        } catch (e) {
          console.log(`Failed to record coin stats for cycle ${cycles[i].counter}`, e)
        }
      }
    } else {
      console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
    }
    startCycle = endCycle + 1
    endCycle = startCycle + bucketSize
  }
}

