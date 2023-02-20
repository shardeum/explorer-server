// require("dotenv").config();

import * as Storage from "./storage";
import * as Transaction from "./storage/transaction";
import * as Account from "./storage/account";
import * as Cycle from "./storage/cycle";
import * as Receipt from "./storage/receipt";
import * as Log from "./storage/log";
import * as crypto from "@shardus/crypto-utils";
import * as utils from "./utils";
import cron from 'node-cron';
import * as StatsStorage from './stats';
import * as ValidatorStats from './stats/validatorStats';
import * as TransactionStats from './stats/transactionStats';


crypto.init("69fa4195670576c0160d660c3be36556ff8d504725be8a59b5a96509e0c994bc");

// config variables
import { config as CONFIG, ARCHIVER_URL, RPC_DATA_SERVER_URL } from "./config";
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
    let waitCycleForTxs = 5 // Calculate transactions count per Cycle after 5 cycles

    let lastStoredValidators = await ValidatorStats.queryLatestValidatorStats(1)
    if (lastStoredValidators.length > 0) lastCheckedCycleForValidators = lastStoredValidators[0].cycle

    let lastStoredTransactions = await TransactionStats.queryLatestTransactionStats(1)
    if (lastStoredTransactions.length > 0) lastCheckedCycleForTxs = lastStoredTransactions[0].cycle

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
        if (latestCycleCounter - waitCycleForTxs >= lastCheckedCycleForTxs) {
            recordTransactionsStats(latestCycleCounter - waitCycleForTxs, lastCheckedCycleForTxs)
            lastCheckedCycleForTxs = latestCycleCounter - waitCycleForTxs
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
            for (let j = 0; j < cycles.length; j++) {
                const filterCycle = transactions.filter(a => a.cycle === cycles[j].counter)
                combineTransactionStats.push({
                    'cycle': cycles[j].counter,
                    'totalTxs': filterCycle.length > 0 ? filterCycle[0].transactions : 0,
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

