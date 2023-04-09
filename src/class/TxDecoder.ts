import { TokenTx, TransactionType, DecodeTxResult } from '../@type'
import { getWeb3, Transaction } from '../storage/transaction'
import Web3 from 'web3'
import { ContractType, Token, queryAccountByAccountId } from '../storage/account'
import * as Log from '../storage/log'
import { config } from '../config/index'
import ERC20_ABI from '../utils/abis/ERC20.json'
import ERC721_ABI from '../utils/abis/ERC721.json'
import ERC1155_ABI from '../utils/abis/ERC1155.json'
import { rlp, toBuffer, bufferToHex } from 'ethereumjs-util'

const ERC_721_INTERFACE = '0x80ac58cd'
const ERC_1155_INTERFACE = '0xd9b67a26'

const ERC_TOKEN_METHOD_DIC = {
  '0xa9059cbb': 'Transfer',
  '0xa978501e': 'Transfer From', // This one seems for old transfer type
  '0x23b872dd': 'Transfer From',
  '0x095ea7b3': 'Approve',
  '0xe63d38ed': 'Disperse ETH',
  '0xc73a2d60': 'Disperse Token',
  '0xf242432a': 'Safe Transfer From',
  '0x42842e0e': 'Safe Transfer From',
  '0x2eb2c2d6': 'Safe Batch Transfer From',
  '0xa22cb465': 'Set Approval For All',
  '0x3593cebc': 'Batch Transfer',
  '0x4885b254': 'Batch Transfer From',
  '0xc9c65396': 'Create Pair',
  '0x02751cec': 'Remove Liquidity ETH',
  '0x1249c58b': 'Mint',
  '0x7ff36ab5': 'Swap Exact SHM For Tokens',
  '0x18cbafe5': 'Swap Exact Tokens For SHM',
  '0x38ed1739': 'Swap Exact Tokens For Tokens',
  '0x2e1a7d4d': 'Withdraw',
  '0xd0e30db0': 'Deposit',
  '0xf305d719': 'Add Liquidity ETH',
  '0xe8e33700': 'Add Liquidity',
}

const ERC_TOKEN_EVENT_DIC = {
  Approval: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925', // ERC20, ERC721
  Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // ERC20, ERC721
  ApprovalForAll: '0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31', // ERC721, ERC1155
  TransferSingle: '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62', // ERC1155
  TransferBatch: '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb', // ERC1155
}
const ERC_TOKEN_APPROVAL_EVENT = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'
const ERC_TOKEN_TRANSFER_EVENT = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const ERC_TOKEN_APPROVAL_FOR_ALL_EVENT = '0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31'
const ERC_TOKEN_TRANSFER_SINGLE_EVENT = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
const ERC_TOKEN_TRANSFER_BATCH_EVENT = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000'

export const ZERO_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

const UNISWAP_SWAP_EVENT = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'
const UNISWAP_SYNC_EVENT = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'
const UNISWAP_DEPOSIT_EVENT = '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c'
const UNISWAP_WITHDRAWAL_EVENT = '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65'
const UNISWAP_MINT_EVENT = '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f'
const UNISWAP_BURN_EVENT = '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496'

const ERC_20_BALANCE = '0x0'
const ERC_721_BALANCE = '0x3'
const ERC_1155_BALANCE = '0x3' // This is not correct; have to research and update it later

export const decodeTx = async (tx: Transaction, storageKeyValueMap: any = {}): Promise<DecodeTxResult> => {
  // let methodCode = tx.data.substr(0, 10);
  //   let TokenTx = {};
  //   let TokenApprove = {};
  //   let tokenTx = false;
  //   if (ERC_TOKEN_METHOD_DIC[methodCode] === 'Transfer') {
  //     // console.log(tx.data)
  //     // Token transfer transaction
  //     TokenTx.tokenFrom = deployerAddress;
  //     TokenTx.tokenTo = `0x${tx.data.substring(34, 74)}`;
  //     // TokenTx.tokenValue = Web3.utils.fromWei(`0x${tx.data.substring(74)}`, "ether");
  //     // TokenTx.tokenValue = ethers.BigNumber.from(`0x${tx.data.substring(74)}`);
  //     TokenTx.tokenValue = `0x${tx.data.substring(74)}`;
  //     console.log('TokenTx', 'Transfer', TokenTx);
  //     tokenTx = true;
  //   } else if (ERC_TOKEN_METHOD_DIC[methodCode] === 'Transfer From') {
  //     // console.log(tx.data)
  //     // Token transferFrom transaction
  //     TokenTx.tokenFrom = `0x${tx.data.substring(34, 74)}`;
  //     TokenTx.tokenTo = `0x${tx.data.substring(98, 138)}`;
  //     // TokenTx.tokenValue = Web3.utils.fromWei(`0x${tx.data.substring(138)}`, "ether");
  //     // TokenTx.tokenValue = ethers.BigNumber.from(`0x${tx.data.substring(138)}`);
  //     TokenTx.tokenValue = `0x${tx.data.substring(138)}`;
  //     console.log('TokenTx', 'TransferFrom', TokenTx);
  //     tokenTx = true;
  //   } else if (ERC_TOKEN_METHOD_DIC[methodCode] === 'Approve') {
  //     // console.log(tx.data)
  //     // Token approve transaction
  //     TokenApprove.tokenFrom = deployerAddress;
  //     TokenApprove.tokenTo = `0x${tx.data.substring(34, 74)}`;
  //     // TokenApprove.tokenValue = Web3.utils.fromWei(`0x${tx.data.substring(74)}`, "ether");
  //     // TokenApprove.tokenValue = ethers.BigNumber.from(`0x${tx.data.substring(74)}`);
  //     TokenApprove.tokenValue = `0x${tx.data.substring(74)}`;
  //     console.log('TokenApprove', 'Approve', TokenApprove);
  //     tokenTx = true;
  //   } else {
  //     console.log('Other methods', methodCode);
  //   }

  // txReceipt = await provider.getTransactionReceipt(tx.hash);
  // console.log('txReceipt', txReceipt)

  // receipt = await web3.eth.getTransactionReceipt(tx.hash);
  // console.log('receipt', receipt);

  //   const iface = new ethers.utils.Interface(TokenABI);
  //   let decodedData = iface.parseTransaction({data: tx.data, tokenValue: tx.value});
  //   console.log(decodedData.args);

  let txs: TokenTx[] = []
  let accs: string[] = []
  let tokens: Token[] = []

  if (tx.wrappedEVMAccount.readableReceipt.status === 0) {
    return {
      txs,
      accs,
      tokens,
    }
  }

  const data = tx.wrappedEVMAccount.readableReceipt.data

  let methodCode = data.length > 10 ? data.substr(0, 10) : null

  const logs = tx.wrappedEVMAccount.readableReceipt && tx.wrappedEVMAccount.readableReceipt.logs
  // console.log('tx', tx.txId, tx.wrappedEVMAccount.readableReceipt)

  if (logs && logs.length > 0) {
    let TransferTX = false
    // console.log('logs', tx.txId, logs)
    // console.log('storageKeyValueMap', storageKeyValueMap)
    for (let i = 0; i < logs.length; i++) {
      let log = logs[i]
      const logToSave = {
        // fromblock:
        // toblock:
        cycle: tx.cycle,
        timestamp: tx.timestamp,
        txHash: tx.txHash,
        contractAddress: log.address,
        log: log,
      } as Log.Log
      for (let j = 0; j < log.topics.length; j++) {
        logToSave[`topic${j}`] = log.topics[j]
      }
      Log.insertLog(logToSave)

      let tokenTx: TokenTx
      if (log.topics) {
        if (log.topics.includes(ERC_TOKEN_TRANSFER_EVENT)) {
          if (!TransferTX && txs.length > 0) {
            if (txs[0].tokenEvent === 'Approval') txs.pop()
          }
          TransferTX = true
          let tokenEvent = 'Transfer'
          if (log.topics[1] === ZERO_ADDRESS) tokenEvent = 'Mint'
          else if (log.topics[2] === ZERO_ADDRESS) tokenEvent = 'Burn'
          tokenTx = {
            tokenType: log.topics[3] ? TransactionType.ERC_721 : TransactionType.ERC_20,
            tokenFrom: `0x${log.topics[1].substring(26)}`.toLowerCase(),
            tokenTo: `0x${log.topics[2].substring(26)}`.toLowerCase(),
            tokenValue: log.topics[3] || log.data,
            tokenEvent,
          } as TokenTx
        } else if (log.topics.includes(ERC_TOKEN_APPROVAL_FOR_ALL_EVENT)) {
          const accountExist = await queryAccountByAccountId(
            log.address.slice(2).toLowerCase() + '0'.repeat(24) //Search by Shardus address
          )
          let tokenType = TransactionType.ERC_721
          if (accountExist && accountExist.contractType === ContractType.ERC_1155)
            tokenType = TransactionType.ERC_1155
          tokenTx = {
            tokenType,
            tokenFrom: `0x${log.topics[1].substring(26)}`.toLowerCase(),
            tokenTo: `0x${log.topics[2].substring(26)}`.toLowerCase(),
            tokenValue: log.data,
            tokenEvent: 'Approval For All',
          } as TokenTx
          if (tokenType === TransactionType.ERC_1155) tokenTx.tokenOperator = null
        } else if (log.topics.includes(ERC_TOKEN_TRANSFER_SINGLE_EVENT)) {
          if (!TransferTX && txs.length > 0) {
            if (txs[0].tokenEvent === 'Approval') txs.pop()
          }
          TransferTX = true
          let tokenEvent = 'Transfer Single'
          if (log.topics[2] === ZERO_ADDRESS) tokenEvent = 'Mint'
          else if (log.topics[3] === ZERO_ADDRESS) tokenEvent = 'Burn'
          if (config.verbose)
            if (log.data.length == 130) {
              console.log(log.data.substring(0, 66))
              console.log(Web3.utils.hexToNumberString(`${log.data.substring(0, 66)}`))
              console.log(log.data.substring(66, 130))
              console.log(Web3.utils.hexToNumberString(`0x${log.data.substring(66, 130)}`))
            }
          tokenTx = {
            tokenType: TransactionType.ERC_1155,
            tokenFrom: `0x${log.topics[2].substring(26)}`.toLowerCase(),
            tokenTo: `0x${log.topics[3].substring(26)}`.toLowerCase(),
            tokenValue: log.data,
            tokenEvent,
            tokenOperator: `0x${log.topics[1].substring(26)}`.toLowerCase(),
          } as TokenTx
        } else if (log.topics.includes(ERC_TOKEN_TRANSFER_BATCH_EVENT)) {
          if (!TransferTX && txs.length > 0) {
            if (txs[0].tokenEvent === 'Approval') txs.pop()
          }
          TransferTX = true
          let tokenEvent = 'Transfer Batch'
          if (log.topics[2] === ZERO_ADDRESS) tokenEvent = 'Mint'
          else if (log.topics[3] === ZERO_ADDRESS) tokenEvent = 'Burn'
          try {
            const web3 = new Web3()
            let result = web3.eth.abi.decodeParameters(['uint256[]', 'uint256[]'], log.data)
            if (config.verbose) console.log('Transfer Batch Decoding', result)
            if (result && result['0'] && result['1'] && result['0'].length === result['1'].length) {
              for (let i = 0; i < result['0'].length; i++) {
                // Created a specail technique to extract the repective tokenValue of each tokenId/value transfer
                const id = `${Web3.utils.padLeft(Web3.utils.numberToHex(result['0'][i]), 64)}`
                const value = `${Web3.utils.padLeft(Web3.utils.numberToHex(result['1'][i]), 64)}`.slice(2)
                const tokenValue = id + value
                tokenTx = {
                  tokenType: TransactionType.ERC_1155,
                  tokenFrom: `0x${log.topics[2].substring(26)}`.toLowerCase(),
                  tokenTo: `0x${log.topics[3].substring(26)}`.toLowerCase(),
                  tokenValue,
                  tokenEvent: 'Transfer Batch',
                  tokenOperator: `0x${log.topics[1].substring(26)}`.toLowerCase(),
                } as TokenTx
                txs.push({
                  ...tokenTx,
                  contractAddress: log.address,
                })
                if (
                  tokenTx.tokenTo !== tx.txFrom &&
                  tokenTx.tokenTo !== tx.txTo &&
                  !accs.includes(tokenTx.tokenTo)
                ) {
                  accs.push(tokenTx.tokenTo.toLowerCase())
                }
                // Skip saving ERC1155 tokens of an address for now
                // if (tokenTx.tokenFrom !== ZERO_ETH_ADDRESS) {
                //   tokens.push({
                //     ethAddress: tokenTx.tokenFrom,
                //     contractAddress: log.address,
                //   })
                // }
                // if (tokenTx.tokenTo !== ZERO_ETH_ADDRESS) {
                //   tokens.push({
                //     ethAddress: tokenTx.tokenTo,
                //     contractAddress: log.address,
                //   })
                // }
              }
              continue
            }
          } catch (e) {
            console.log('Error in decoding transferBatch', e)
            tokenTx = {
              tokenType: TransactionType.ERC_1155,
              tokenFrom: `0x${log.topics[2].substring(26)}`.toLowerCase(),
              tokenTo: `0x${log.topics[3].substring(26)}`.toLowerCase(),
              tokenValue: log.data,
              tokenEvent,
              tokenOperator: `0x${log.topics[1].substring(26)}`.toLowerCase(),
            } as TokenTx
          }
        } else if (!TransferTX && log.topics.includes(ERC_TOKEN_APPROVAL_EVENT)) {
          tokenTx = {
            tokenType: log.topics[3] ? TransactionType.ERC_721 : TransactionType.ERC_20,
            tokenFrom: `0x${log.topics[1].substring(26)}`.toLowerCase(),
            tokenTo: `0x${log.topics[2].substring(26)}`.toLowerCase(),
            tokenValue: log.topics[3] || log.data,
            tokenEvent: 'Approval',
          } as TokenTx
        } else if (log.topics.includes(UNISWAP_SYNC_EVENT)) {
          if (config.verbose) console.log('Uniswap Sync', log.data.length, log.data)
          if (config.verbose)
            if (log.data.length == 130) {
              console.log(log.data.substring(0, 66))
              console.log(Web3.utils.fromWei(`${log.data.substring(0, 66)}`, 'ether'))
              console.log(log.data.substring(66, 130))
              console.log(Web3.utils.fromWei(`${log.data.substring(66, 130)}`, 'ether'))
            } else console.log('length is not equal to 130')
        } else if (log.topics.includes(UNISWAP_SWAP_EVENT)) {
          if (config.verbose) console.log('Uniswap Swap', log.data.length, log.data)
          if (config.verbose)
            if (log.data.length == 258) {
              console.log(log.data.substring(0, 66))
              console.log(Web3.utils.fromWei(`${log.data.substring(0, 66)}`, 'ether'))
              console.log(log.data.substring(66, 130))
              console.log(Web3.utils.fromWei(`${log.data.substring(66, 130)}`, 'ether'))
              console.log(log.data.substring(130, 194))
              console.log(Web3.utils.fromWei(`${log.data.substring(130, 194)}`, 'ether'))
              console.log(log.data.substring(194, 258))
              console.log(Web3.utils.fromWei(`${log.data.substring(192, 258)}`, 'ether'))
            } else console.log('length is not equal to 258')
        } else if (log.topics.includes(UNISWAP_DEPOSIT_EVENT)) {
          if (config.verbose) console.log('Uniswap Deposit', log.data.length, log.data)
          if (config.verbose) console.log(Web3.utils.fromWei(log.data, 'ether'))
          if (tx.txTo !== log.address)
            tokenTx = {
              tokenType: TransactionType.EVM_Internal,
              tokenFrom: `0x${log.topics[1].substring(26)}`.toLowerCase(),
              tokenTo: log.address,
              tokenValue: log.data,
              tokenEvent: 'Internal Transfer',
            } as TokenTx
        } else if (log.topics.includes(UNISWAP_WITHDRAWAL_EVENT)) {
          if (config.verbose) console.log('Uniswap Withdraw', log.data.length, log.data)
          if (config.verbose) console.log(Web3.utils.fromWei(log.data, 'ether'))
          if (tx.txTo !== log.address)
            tokenTx = {
              tokenType: TransactionType.EVM_Internal,
              tokenFrom: log.address,
              tokenTo: `0x${log.topics[1].substring(26)}`.toLowerCase(),
              tokenValue: log.data,
              tokenEvent: 'Internal Transfer',
            } as TokenTx
        }
      }
      if (tokenTx) {
        txs.push({
          ...tokenTx,
          contractAddress: log.address,
        })
        if (
          tokenTx.tokenTo &&
          tokenTx.tokenTo !== tx.txFrom &&
          tokenTx.tokenTo !== tx.txTo &&
          !accs.includes(tokenTx.tokenTo)
        ) {
          accs.push(tokenTx.tokenTo.toLowerCase())
        }
        // Skip saving ERC1155 tokens of an address for now
        if (
          tokenTx.tokenEvent !== 'Approval' &&
          tokenTx.tokenEvent !== 'Approval For All' &&
          (tokenTx.tokenType === TransactionType.EVM_Internal ||
            tokenTx.tokenType === TransactionType.ERC_20 ||
            tokenTx.tokenType === TransactionType.ERC_721)
        ) {
          let storageKey =
            tokenTx.tokenType === TransactionType.ERC_20
              ? ERC_20_BALANCE
              : tokenTx.tokenType === TransactionType.ERC_721
              ? ERC_721_BALANCE
              : ERC_1155_BALANCE
          if (tokenTx.tokenFrom !== ZERO_ETH_ADDRESS) {
            let tokenValue = '0'
            let calculatedKey = Web3.utils
              .soliditySha3({ type: 'uint', value: tokenTx.tokenFrom }, { type: 'uint', value: storageKey })
              .slice(2)
            // console.log(tokenTx.tokenType, tokenTx.tokenFrom, calculatedKey + log.address)
            let contractStorage
            if (
              Object.keys(storageKeyValueMap).length === 0 ||
              !storageKeyValueMap[calculatedKey + log.address]
            ) {
              if (Object.keys(storageKeyValueMap).length === 0) {
                let shardusAddress = log.address.slice(2).substring(0, 8) + calculatedKey.substring(8)
                contractStorage = await queryAccountByAccountId(shardusAddress)
                // console.log('contractStorage', contractStorage)
              }
              if (!contractStorage)
                for (let i = 0; i < 20; i++) {
                  calculatedKey = Web3.utils
                    .soliditySha3({ type: 'uint', value: tokenTx.tokenFrom }, { type: 'uint', value: '' + i })
                    .slice(2)
                  // console.log('calculatedKey', calculatedKey + log.address)
                  if (Object.keys(storageKeyValueMap).length === 0) {
                    let shardusAddress = log.address.slice(2).substring(0, 8) + calculatedKey.substring(8)
                    contractStorage = await queryAccountByAccountId(shardusAddress)
                    // console.log('contractStorage', contractStorage)
                    break
                  } else if (storageKeyValueMap[calculatedKey + log.address]) break
                }
              // console.log(tokenTx.tokenType, tokenTx.tokenFrom, calculatedKey + log.address)
            }
            if (
              storageKeyValueMap[calculatedKey + log.address] ||
              (contractStorage && contractStorage.ethAddress === log.address)
            ) {
              // console.log(storageKeyValueMap[calculatedKey + log.address].value)
              const value = contractStorage
                ? contractStorage.account.value
                : storageKeyValueMap[calculatedKey + log.address].value
              const decode = rlp.decode(toBuffer(bufferToHex(value.data))).toString('hex')
              // if (tokenTx.tokenType === TransactionType.ERC_20) {
              //   tokenValue = Web3.utils.fromWei(decode, 'ether')
              // } else if (tokenTx.tokenType === TransactionType.ERC_721) {
              //   tokenValue = Web3.utils.hexToNumberString('0x' + decode)
              // }
              tokenValue = Web3.utils.hexToNumberString('0x' + decode)
              // console.log(calculatedKey, tokenValue)
            }
            tokens.push({
              ethAddress: tokenTx.tokenFrom,
              contractAddress: log.address,
              tokenValue,
              tokenType: tokenTx.tokenType,
            })
          }
          if (tokenTx.tokenTo !== ZERO_ETH_ADDRESS) {
            let tokenValue = '0'
            let calculatedKey = Web3.utils
              .soliditySha3({ type: 'uint', value: tokenTx.tokenTo }, { type: 'uint', value: storageKey })
              .slice(2)
            // console.log(tokenTx.tokenType, tokenTx.tokenTo, calculatedKey + log.address)
            let contractStorage
            if (
              Object.keys(storageKeyValueMap).length === 0 ||
              !storageKeyValueMap[calculatedKey + log.address]
            ) {
              if (Object.keys(storageKeyValueMap).length === 0) {
                let shardusAddress = log.address.slice(2).substring(0, 8) + calculatedKey.substring(8)
                contractStorage = await queryAccountByAccountId(shardusAddress)
                // console.log('contractStorage', contractStorage)
              }
              if (!contractStorage)
                for (let i = 0; i < 20; i++) {
                  calculatedKey = Web3.utils
                    .soliditySha3({ type: 'uint', value: tokenTx.tokenTo }, { type: 'uint', value: '' + i })
                    .slice(2)
                  // console.log('calculatedKey', calculatedKey + log.address)
                  if (Object.keys(storageKeyValueMap).length === 0) {
                    let shardusAddress = log.address.slice(2).substring(0, 8) + calculatedKey.substring(8)
                    contractStorage = await queryAccountByAccountId(shardusAddress)
                    // console.log('contractStorage', contractStorage)
                    break
                  } else if (
                    storageKeyValueMap[calculatedKey + log.address] &&
                    storageKeyValueMap[calculatedKey + log.address].ethAddress === log.address
                  )
                    break
                }
              // console.log(tokenTx.tokenType, tokenTx.tokenTo, calculatedKey + log.address)
            }
            if (
              storageKeyValueMap[calculatedKey + log.address] ||
              (contractStorage && contractStorage.ethAddress === log.address)
            ) {
              const value = contractStorage
                ? contractStorage.account.value
                : storageKeyValueMap[calculatedKey + log.address].value
              // console.log(storageKeyValueMap[calculatedKey + log.address].value)
              const decode = rlp.decode(toBuffer(bufferToHex(value.data))).toString('hex')
              // if (tokenTx.tokenType === TransactionType.ERC_20) {
              //   tokenValue = Web3.utils.fromWei(decode, 'ether')
              // } else if (tokenTx.tokenType === TransactionType.ERC_721) {
              //   tokenValue = Web3.utils.hexToNumberString('0x' + decode)
              // }
              tokenValue = Web3.utils.hexToNumberString('0x' + decode)
              // console.log(calculatedKey, tokenValue)
            }
            tokens.push({
              ethAddress: tokenTx.tokenTo,
              contractAddress: log.address,
              tokenValue,
              tokenType: tokenTx.tokenType,
            })
          }
        }
      }
    }
  }
  if (ERC_TOKEN_METHOD_DIC[methodCode] === 'Disperse ETH') {
    try {
      const web3 = new Web3()
      const result = web3.eth.abi.decodeParameters(
        ['address[]', 'uint256[]'],
        tx.wrappedEVMAccount.readableReceipt.data.slice(10)
      )
      if (result && result['0'] && result['1'] && result['0'].length === result['1'].length) {
        for (let i = 0; i < result['0'].length; i++) {
          const tokenTx = {
            tokenType: TransactionType.EVM_Internal,
            tokenFrom: tx.txTo,
            tokenTo: result['0'][i].toLowerCase(),
            tokenValue: result['1'][i],
            tokenEvent: 'Internal Transfer',
          } as TokenTx
          txs.push({
            ...tokenTx,
            contractAddress: tx.txTo,
          })
          accs.push(tokenTx.tokenTo.toLowerCase())
        }
      }
    } catch (e) {
      console.log('Error in decoding disperseETH', e)
    }
  }
  const decodeTxResult: DecodeTxResult = {
    txs,
    accs,
    tokens,
  }
  return decodeTxResult
}

export const getContractInfo = async (contractAddress) => {
  let contractType: ContractType = ContractType.GENERIC
  let contractInfo: any = {}
  let foundCorrectContract = false
  try {
    const web3: any = await getWeb3()
    const Token = new web3.eth.Contract(ERC20_ABI.abi, contractAddress)
    contractInfo.name = await Token.methods.name().call()
    if (config.verbose) console.log('Token Name', contractInfo.name)
    contractInfo.symbol = await Token.methods.symbol().call()
    contractInfo.totalSupply = await Token.methods.totalSupply().call()
    contractInfo.decimals = await Token.methods.decimals().call()
    foundCorrectContract = true
    contractType = ContractType.ERC_20
    // await sleep(200); // Awaiting a bit to refresh the service points of the validator
  } catch (e) {
    // console.log(e);
    console.log('Non ERC 20 Contract', contractAddress) // It could be not ERC 20 Contract
    // await sleep(100); // Awaiting a bit to refresh the service points of the validator
  }
  if (!foundCorrectContract) {
    try {
      const web3: any = await getWeb3()
      const Token = new web3.eth.Contract(ERC721_ABI.abi, contractAddress)
      const result = await Token.methods.supportsInterface(ERC_721_INTERFACE).call()
      if (result) {
        if (!contractInfo.name) contractInfo.name = await Token.methods.name().call()
        if (config.verbose) console.log('ERC 721 Name', contractInfo.name)
        if (!contractInfo.symbol) contractInfo.symbol = await Token.methods.symbol().call()
        foundCorrectContract = true
        contractType = ContractType.ERC_721
        // await sleep(200); // Awaiting a bit to refresh the service points of the validator
      }
    } catch (e) {
      // console.log(e);
      console.log('Non ERC 721 Contract', contractAddress) // It could be not ERC 20 Contract
      // await sleep(100); // Awaiting a bit to refresh the service points of the validator
    }
  }
  if (!foundCorrectContract) {
    try {
      const web3: any = await getWeb3()
      const Token = new web3.eth.Contract(ERC1155_ABI.abi, contractAddress)
      const result = await Token.methods.supportsInterface(ERC_1155_INTERFACE).call()
      if (result) {
        foundCorrectContract = true
        contractType = ContractType.ERC_1155
        // await sleep(200); // Awaiting a bit to refresh the service points of the validator
      }
    } catch (e) {
      // console.log(e);
      console.log('Non ERC 1155 Contract', contractAddress) // It could be not ERC 20 Contract
      // await sleep(100); // Awaiting a bit to refresh the service points of the validator
    }
  }
  return { contractInfo, contractType }
}
