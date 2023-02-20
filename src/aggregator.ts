// require("dotenv").config();

import * as Storage from "./storage";
import * as Transaction from "./storage/transaction";
import * as Account from "./storage/account";
import * as Cycle from "./storage/cycle";
import * as Receipt from "./storage/receipt";
import * as Log from "./storage/log";
import * as crypto from "@shardus/crypto-utils";
import * as utils from "./utils";
import { Server, IncomingMessage, ServerResponse } from "http";
import axios from "axios";
import { AccountSearchType, AccountType, TransactionSearchType } from "./@type";
import cron from 'node-cron';
import * as StatsStorage from './stats';
import * as Validator from './stats/validators';


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
    let lastCheckedCycle = 0

    let lastStoredValidators = await Validator.queryLatestValidators(1)
    if (lastStoredValidators.length > 0) lastCheckedCycle = lastStoredValidators[0].cycle

    console.log('lastCheckedCycle', lastCheckedCycle)
    if (measure_time)
        start_time = process.hrtime();
    cron.schedule('*/30 * * * * *', async () => {
        console.log('Running cron task....');
        let latestCycleRecord = await Cycle.queryLatestCycleRecords(1)
        let latestCycleCounter = latestCycleRecord.length > 0 ? latestCycleRecord[0].counter : 0
        console.log('latestCycleCounter', latestCycleCounter)
        if (latestCycleCounter > lastCheckedCycle) {
            if (latestCycleCounter - lastCheckedCycle === 1)
                await insertValidatorStats(latestCycleRecord[0].cycleRecord)
            else recordOldValidatorsStats(latestCycleCounter, lastCheckedCycle)
            lastCheckedCycle = latestCycleCounter
        }
        if (measure_time && start_time) {
            var end_time = process.hrtime(start_time);
            console.log('End Time', end_time)
            start_time = process.hrtime();
        }
    });

};

start();

const insertValidatorStats = async (cycleRecord) => {
    const validatorsInfo: Validator.Validator = {
        'cycle': cycleRecord.counter,
        'active': cycleRecord.active,
        'timestamp': cycleRecord.start
    }
    await Validator.insertValidator(validatorsInfo)
}

const recordOldValidatorsStats = async (latestCycle: number, lastStoredCycle: number) => {
    let combineValidators: Validator.Validator[] = []
    let bucketSize = 10
    let startCycle = lastStoredCycle;
    let endCycle = startCycle + bucketSize;
    while (startCycle <= latestCycle) {
        if (endCycle > latestCycle) endCycle = latestCycle
        const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle)
        if (cycles.length > 0) {
            for (let j = 0; j < cycles.length; j++) {
                combineValidators.push({
                    'cycle': cycles[j].counter,
                    'active': cycles[j].cycleRecord.active,
                    'timestamp': cycles[j].cycleRecord.start
                })
            }
            await Validator.bulkInsertValidators(combineValidators)
            combineValidators = []
        } else {
            console.log(`Fail to fetch cycleRecords between ${startCycle} and ${endCycle}`)
        }
        startCycle = endCycle + 1
        endCycle = startCycle + bucketSize;
    }

}
