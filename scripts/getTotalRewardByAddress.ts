import fs from 'fs'
import axios from 'axios'
import Web3 from 'web3'

const EXPLORE_URL = 'http://localhost:6001'
const UNSTAKE_TX_TYPE = 4

const getTotalRewardByAddress = async (): Promise<void> => {
    let url = `${EXPLORE_URL}/api/transaction?txType=${UNSTAKE_TX_TYPE}`

    let operatorAccountMap = {}

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
                    if (!operatorAccountMap[tx.wrappedEVMAccount.txFrom]) {
                        operatorAccountMap[tx.wrappedEVMAccount.txFrom] = Web3.utils.toBN(
                            Number(
                                '0x' + tx.wrappedEVMAccount.readableReceipt.stakeInfo.reward
                            ).toString()
                        )
                        // operatorAccountMap[tx.wrappedEVMAccount.txFrom] =
                        //   Web3.utils.fromWei(
                        //     tx.wrappedEVMAccount.readableReceipt.stakeInfo.reward,
                        //     'ether'
                        //   )
                    } else {
                        operatorAccountMap[tx.wrappedEVMAccount.txFrom] =
                            operatorAccountMap[tx.wrappedEVMAccount.txFrom].add(
                                Web3.utils.toBN(
                                    Number(
                                        '0x' + tx.wrappedEVMAccount.readableReceipt.stakeInfo.reward
                                    ).toString()
                                )
                            )
                    }
                    // console.log(
                    //   tx.wrappedEVMAccount.txFrom,
                    //   Web3.utils.toBN(
                    //     Number(
                    //       '0x' + tx.wrappedEVMAccount.readableReceipt.stakeInfo.reward
                    //     ).toString()
                    //   )
                    //   // Web3.utils.fromWei(
                    //   //   tx.wrappedEVMAccount.readableReceipt.stakeInfo.reward,
                    //   //   'ether'
                    //   // )
                    // )
                })
            }
        }

        // console.log(operatorAccountMap)

        const sortedOperatorAccountMap = Object.entries(operatorAccountMap)
            .sort(([, a]: any, [, b]: any) => b.sub(a))
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {})

        // console.log(sortedOperatorAccountMap)

        for (const operatorAcc of Object.keys(sortedOperatorAccountMap)) {
            const BNvalue = sortedOperatorAccountMap[operatorAcc]
            sortedOperatorAccountMap[operatorAcc] = Web3.utils.fromWei(
                BNvalue,
                'ether'
            )
        }

        // console.log(sortedOperatorAccountMap)

        fs.writeFileSync(
            'operatorAddressTotalRewardMap.json',
            JSON.stringify(sortedOperatorAccountMap, null, 2)
        )
    }
    // console.log(Web3.utils.toBN('1583333333333333200'))
}
getTotalRewardByAddress()
