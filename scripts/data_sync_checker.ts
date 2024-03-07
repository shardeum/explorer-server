import axios from 'axios'
import * as crypto from '@shardus/crypto-utils'
import { config } from '../src/config'
import { queryFromDistributor, DataType } from '../src/class/DataSync'
import { isDeepStrictEqual } from 'util'
import { writeFileSync } from 'fs'
crypto.init(config.hashKey)

const API_SERVER_URL = 'http:/127.0.0.1:6001'

const startCycle = 10000
const endCycle = 10200
const saveToFile = false

const data_type: any = DataType.RECEIPT // DataType.RECEIPT // DataType.CYCLE // DataType.ORIGINALTX
const api_url = data_type === DataType.RECEIPT ? 'receipt' : data_type === DataType.CYCLE ? 'cycleinfo' : 'originalTx'

const runProgram = async (): Promise<void> => {
    const limit = 100
    let distributor_responses: any = []
    let api_responses: any = []
    let nextEnd = startCycle + limit
    for (let i = startCycle; i < endCycle;) {
        console.log(`Start Cycle ${i} End Cycle ${nextEnd}`)
        const distributor_data = data_type === DataType.CYCLE ? {
            start: i,
            end: nextEnd
        } : {
            startCycle: i,
            endCycle: nextEnd,
            type: 'tally'
        }
        const api_data = data_type === DataType.CYCLE ? `?start=${i}&end=${nextEnd}` : `?startCycle=${i}&endCycle=${nextEnd}&tally=true`

        const res1 = await queryFromDistributor(data_type, distributor_data)
        // console.log(res1.data)

        const res2 = await axios.get(`${API_SERVER_URL}/api/${api_url}${api_data}`)
        // console.log(res2.data)

        switch (data_type) {
            case DataType.RECEIPT:
                distributor_responses = [...distributor_responses, ...res1.data.receipts]
                api_responses = [...api_responses, ...res2.data.totalReceipts]
                break
            case DataType.CYCLE:
                distributor_responses = [...distributor_responses, ...res1.data.cycleInfo]
                api_responses = [...api_responses, ...res2.data.cycles]
                break
            case DataType.ORIGINALTX:
                distributor_responses = [...distributor_responses, ...res1.data.originalTxs]
                api_responses = [...api_responses, ...res2.data.totalOriginalTxs]
                break
        }
        i = nextEnd + 1
        nextEnd += limit
    }
    console.log('DISTRIBUTOR RESPONSES', distributor_responses.length, 'API SERVER RESPONSES', api_responses.length)
    console.log(isDeepStrictEqual(distributor_responses, api_responses))
    // console.dir(responses, { depth: null })
    // save to file
    if (saveToFile) {
        writeFileSync(`distributor_${data_type}_${startCycle}_${endCycle}.json`, JSON.stringify(distributor_responses))
        writeFileSync(`api_server_${data_type}_${startCycle}_${endCycle}.json`, JSON.stringify(api_responses))
    }
}
runProgram()