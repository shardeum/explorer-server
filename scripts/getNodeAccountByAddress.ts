import fs from 'fs'
import axios from 'axios'
import Web3 from 'web3'

const EXPLORE_URL = 'http://localhost:6001'
const STAKE_TX_TYPE = 3
const NODE_ACCOUNT_TYPE = 9

async function sleep(time: number): Promise<void> {
    return new Promise((resolve: any) => {
        setTimeout(() => {
            resolve(true)
        }, time)
    })
}

const getNodeAccountByAddress = async (): Promise<void> => {
    let url = `${EXPLORE_URL}/api/transaction?txType=${STAKE_TX_TYPE}`

    let operatorAddresses: any = {}
    let nodeAccounts = {}
    let count = 0

    let queryPerSecond = 100

    let result = await axios.get(url)
    if (result.data && result.data.success) {
        console.log(result.data)
        const totalPages = result.data.totalPages
        for (let i = 1; i <= totalPages; i++) {
            console.log(`Getting txs from page ${i}`)
            const a = url + `&page=${i}`
            result = await axios.get(a)
            if (result.data && result.data.success) {
                for (const tx of result.data.transactions) {
                    const nodeAddress =
                        tx.wrappedEVMAccount.readableReceipt.stakeInfo.nominee
                    if (operatorAddresses[tx.wrappedEVMAccount.txFrom]) {
                        let found = false
                        for (const address of operatorAddresses[tx.wrappedEVMAccount.txFrom])
                            if (address === nodeAddress) {
                                found = true
                                break
                            }
                        if (!found) operatorAddresses[tx.wrappedEVMAccount.txFrom].push(nodeAddress)
                    } else operatorAddresses[tx.wrappedEVMAccount.txFrom] = [nodeAddress]
                }

            }
        }
        let count = 0
        let limit = 10000
        let page = 1
        for (let operatorAddress of Object.keys(operatorAddresses)) {
            nodeAccounts[operatorAddress] = []
            for (const nodeAddress of operatorAddresses[operatorAddress]) {
                let accountSearchUrl = `${EXPLORE_URL}/api/account?address=${nodeAddress}&accountType=${NODE_ACCOUNT_TYPE}`
                result = await axios.get(accountSearchUrl)
                if (
                    result.data &&
                    result.data.success &&
                    result.data.accounts &&
                    result.data.accounts.length > 0
                ) {
                    const nodeAccount = result.data.accounts[0].account
                    nodeAccounts[operatorAddress].push(nodeAccount)
                } else console.log('Node Account Not Found!', nodeAddress)
            }
            count++
            console.log(count)
            await sleep(1000 / queryPerSecond)
            if (count % limit === 0) {
                fs.writeFileSync(
                    `nodeAccountByoperatorAddress${page}.json`,
                    JSON.stringify(nodeAccounts, null, 2)
                )
                page++
                await sleep(2000)
                nodeAccounts = {}
            }
        }
        fs.writeFileSync(
            `nodeAccountByoperatorAddress${page}.json`,
            JSON.stringify(nodeAccounts, null, 2)
        )
    }
}
getNodeAccountByAddress()
