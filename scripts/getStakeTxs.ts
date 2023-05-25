import * as fs from 'fs'
import axios from 'axios'
import Web3 from 'web3'
import { TransactionType } from '../src/frontend/types'

const EXPLORE_URL = 'http://localhost:6001'
const STAKE_TX_TYPE = TransactionType.StakeReceipt

const getStakeTx = async (): Promise<void> => {
    let url = `${EXPLORE_URL}/api/transaction?txType=${STAKE_TX_TYPE}`

    let stakingTxs: any = []

    let result = await axios.get(url)
    if (result.data && result.data.success) {
        console.log(result.data)
        const totalPages = result.data.totalPages
        for (let i = 1; i <= totalPages; i++) {
            console.log(`Getting txs from page ${i}`)
            const a = url + `&page=${i}`
            result = await axios.get(a)
            if (result.data && result.data.success) {
                result.data.transactions.forEach(tx => {
                    stakingTxs.push({
                        operatorAddress: tx.wrappedEVMAccount.txFrom,
                        nodeAddress: tx.wrappedEVMAccount.readableReceipt.stakeInfo.nominee,
                        stakeAmount: Web3.utils.fromWei(
                            tx.wrappedEVMAccount.readableReceipt.stakeInfo.stake,
                            'ether'
                        ),
                        timestamp: tx.timestamp,
                    })
                })
            }
        }

        fs.writeFileSync('stakeTxs.json', JSON.stringify(stakingTxs, null, 2))
    }
}
getStakeTx()
