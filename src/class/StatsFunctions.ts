import * as CoinStats from '../stats/coinStats'
import * as TransactionStats from '../stats/transactionStats'
import * as ValidatorStats from '../stats/validatorStats'
import * as NodeStats from '../stats/nodeStats'
import * as Metadata from '../stats/metadata'
import * as Cycle from '../storage/cycle'
import * as Transaction from '../storage/transaction'
import { InternalTXType, TransactionSearchType, TransactionType } from '../types'
import BN from 'bn.js'
import BigNumber from 'decimal.js'
import { CycleRecord } from '@shardus/types/build/src/p2p/CycleCreatorTypes'
import { config } from '../config/index'
import { JoinRequest, JoinedConsensor } from '@shardus/types/build/src/p2p/JoinTypes'

interface NodeState {
  state: string
  id?: string
  nominator?: string
}

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

export const recordMissingTransactionStats = async (missingCycles: number[]): Promise<void> => {
  if (!missingCycles.length) {
    console.log('No missing cycles provided.')
    return
  }

  const combineTransactionStats: TransactionStats.TransactionStats[] = []

  for (const cycleNumber of missingCycles) {
    const cycle = await Cycle.queryCycleByCounter(cycleNumber)
    if (!cycle) {
      console.log(`No cycle record found for cycle ${cycleNumber}`)
      continue
    }

    const transactions = await Transaction.queryTransactionCountByCycles(cycleNumber, cycleNumber)
    const stakeTransactions = await Transaction.queryTransactionCountByCycles(
      cycleNumber,
      cycleNumber,
      TransactionSearchType.StakeReceipt
    )
    const unstakeTransactions = await Transaction.queryTransactionCountByCycles(
      cycleNumber,
      cycleNumber,
      TransactionSearchType.UnstakeReceipt
    )
    const internalTransactions = await Transaction.queryTransactionCountByCycles(
      cycleNumber,
      cycleNumber,
      TransactionSearchType.InternalTxReceipt
    )
    const granularInternalTransactions = await Transaction.queryInternalTransactionCountByCycles(
      cycleNumber,
      cycleNumber
    )

    // Filter results for the current cycle (in case the query returns an array).
    const txsCycle = transactions.filter((a: { cycle: number }) => a.cycle === cycleNumber)
    const internalTxsCycle = internalTransactions.filter((a: { cycle: number }) => a.cycle === cycleNumber)
    const stakeTxsCycle = stakeTransactions.filter((a: { cycle: number }) => a.cycle === cycleNumber)
    const unstakeTxsCycle = unstakeTransactions.filter((a: { cycle: number }) => a.cycle === cycleNumber)

    // Initialize counts for the granular internal transactions.
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

    // Process each granular internal transaction.
    granularInternalTransactions
      .filter(({ cycle: c }) => c === cycleNumber)
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

    // Combine all stats into one object for this cycle.
    combineTransactionStats.push({
      cycle: cycleNumber,
      totalTxs: txsCycle.length > 0 ? txsCycle[0].transactions : 0,
      totalInternalTxs: internalTxsCycle.length > 0 ? internalTxsCycle[0].transactions : 0,
      totalStakeTxs: stakeTxsCycle.length > 0 ? stakeTxsCycle[0].transactions : 0,
      totalUnstakeTxs: unstakeTxsCycle.length > 0 ? unstakeTxsCycle[0].transactions : 0,
      ...granularInternalTxCounts,
      timestamp: cycle.cycleRecord.start,
    })
  }

  if (combineTransactionStats.length > 0) {
    if (config.verbose) {
      console.log(
        'Reinserting transaction stats for cycles:',
        combineTransactionStats.map((stat) => stat.cycle)
      )
    }
    await TransactionStats.bulkInsertTransactionsStats(combineTransactionStats)
  } else {
    console.log('No missing transaction stats to update.')
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
              const stakeAmountBN = new BN(
                current.wrappedEVMAccount.readableReceipt.stakeInfo.stake.toString()
              ) // changed to accomodate BigInt instead of Hex string
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
              const unStakeAmountBN = new BN(
                current.wrappedEVMAccount.readableReceipt.stakeInfo.stake.toString()
              )
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

// Update NodeStats record based on new status
export function updateNodeStats(
  nodeStats: NodeStats.NodeStats,
  newState: NodeState,
  currentTimestamp: number
): NodeStats.NodeStats {
  const timeStampDiff = currentTimestamp - nodeStats.timestamp
  switch (nodeStats.currentState) {
    case 'standbyAdd':
      if (newState.state == 'standbyRefresh' || newState.state == 'joinedConsensors') {
        nodeStats.totalStandbyTime += timeStampDiff
      } else {
        /* prettier-ignore */ if (config.verbose) console.log(`Unknown state transition from standbyAdd to ${newState.state}`)
      }
      break

    case 'standbyRefresh':
      if (newState.state == 'joinedConsensors') {
        nodeStats.totalStandbyTime += timeStampDiff
      } else {
        /* prettier-ignore */ if (config.verbose) console.log(`Unknown state transition from standbyRefresh to ${newState.state}`)
      }
      break

    case 'activated':
      if (newState.state == 'removed' || newState.state == 'apoptosized') {
        nodeStats.totalActiveTime += timeStampDiff
      } else {
        /* prettier-ignore */ if (config.verbose) console.log(`Unknown state transition from activated to ${newState.state}`)
      }
      break

    case 'joinedConsensors':
    case 'startedSyncing':
    case 'finishedSyncing':
      // eslint-disable-next-line no-case-declarations
      const validStates: string[] = ['startedSyncing', 'finishedSyncing', 'activated']
      if (validStates.includes(newState.state)) {
        nodeStats.totalSyncTime += timeStampDiff
      } else {
        /* prettier-ignore */ if (config.verbose) console.log(`Unknown state transition from ${nodeStats.currentState} to ${newState.state}`)
      }
      break
    default:
      break
  }

  // Update current state and add nodedId if it exists
  nodeStats.currentState = newState.state
  nodeStats.timestamp = currentTimestamp
  if (newState.nominator) {
    nodeStats.nominator = newState.nominator
  }
  if (newState.id) {
    nodeStats.nodeId = newState.id
  }
  return nodeStats
}

export const recordNodeStats = async (latestCycle: number, lastStoredCycle: number): Promise<void> => {
  try {
    const statesToIgnore = ['activatedPublicKeys', 'standbyRefresh', 'lost', 'refuted']
    const bucketSize = 100
    let startCycle = lastStoredCycle + 1
    let endCycle = startCycle + bucketSize
    while (startCycle <= latestCycle) {
      if (endCycle > latestCycle) endCycle = latestCycle
      /* prettier-ignore */ if (config.verbose) console.log(`recordNodeStats: processing nodeStats for cycles from ${startCycle} to ${endCycle}`)

      const cycles = await Cycle.queryCycleRecordsBetween(startCycle, endCycle, 'ASC')
      /* prettier-ignore */ if (config.verbose) console.log('recordNodeStats: fetched cycle records', cycles)

      if (cycles.length > 0) {
        for (const cycle of cycles) {
          const pubKeyToStateMap = new Map<string, NodeState>()
          const IdToStateMap = new Map<string, string>()

          Object.keys(cycle.cycleRecord).forEach((key) => {
            // eslint-disable-next-line security/detect-object-injection
            const value = cycle.cycleRecord[key]
            if (
              Array.isArray(value) &&
              !key.toLowerCase().includes('archivers') &&
              !statesToIgnore.includes(key)
            ) {
              // pre-Id states containing complex object list
              if (key == 'joinedConsensors') {
                value.forEach((item: JoinedConsensor) => {
                  pubKeyToStateMap.set(item['address'], { state: 'joinedConsensors', id: item['id'] })
                })
              } else if (key == 'standbyAdd') {
                value.forEach((item: JoinRequest) => {
                  pubKeyToStateMap.set(item['nodeInfo']['address'], {
                    state: 'standbyAdd',
                    nominator: item?.appJoinData?.stakeCert?.nominator,
                  })
                })

                // post-Id states
              } else if (key == 'startedSyncing') {
                value.forEach((item: string) => {
                  IdToStateMap.set(item, 'startedSyncing')
                })
              } else if (key == 'finishedSyncing') {
                value.forEach((item: string) => {
                  IdToStateMap.set(item, 'finishedSyncing')
                })
              } else if (key == 'removed') {
                value.forEach((item: string) => {
                  if (item != 'all') IdToStateMap.set(item, 'removed')
                })
              } else if (key == 'activated') {
                value.forEach((item: string) => {
                  IdToStateMap.set(item, 'activated')
                })

                // pre-Id states containing simple string list
              } else {
                /* prettier-ignore */ if (config.verbose) console.log(`Unknown state type detected: ${key}`)
                value.forEach((item: string) => {
                  pubKeyToStateMap.set(item, { state: key })
                })
              }
            }
          })

          /* prettier-ignore */ if (config.verbose) console.log(`pubKeyToStateMap for cycle ${cycle.counter}:`, pubKeyToStateMap)
          /* prettier-ignore */ if (config.verbose) console.log(`IdToStateMap for cycle ${cycle.counter}:`, IdToStateMap)
          const updatedNodeStatsCombined: NodeStats.NodeStats[] = []
          // Iterate over pubKeyToStateMap
          for (const [nodeKey, nodeState] of pubKeyToStateMap) {
            const existingNodeStats: NodeStats.NodeStats = await NodeStats.getNodeStatsByAddress(nodeKey)
            if (existingNodeStats) {
              /* prettier-ignore */ if (config.verbose) console.log(`existingNodeStats: `, existingNodeStats)
              // node statistics exists, update node statistics record
              const updatedNodeStats = updateNodeStats(existingNodeStats, nodeState, cycle.cycleRecord.start)
              /* prettier-ignore */ if (config.verbose) console.log(`updatedNodeStats: `, updatedNodeStats)
              updatedNodeStatsCombined.push(updatedNodeStats)
              await NodeStats.insertOrUpdateNodeStats(updatedNodeStats)
            } else {
              const nodeStats: NodeStats.NodeStats = {
                nodeAddress: nodeKey,
                nominator: nodeState.nominator ?? null,
                nodeId: nodeState.id,
                currentState: nodeState.state,
                totalStandbyTime: 0,
                totalActiveTime: 0,
                totalSyncTime: 0,
                timestamp: cycle.cycleRecord.start,
              }
              /* prettier-ignore */ if (config.verbose) console.log('Adding new node stats:', nodeStats)
              updatedNodeStatsCombined.push(nodeStats)
              await NodeStats.insertOrUpdateNodeStats(nodeStats)
            }
          }

          // Iterate over nodeStatus Map
          for (const [nodeId, nodeState] of IdToStateMap) {
            const existingNodeStats: NodeStats.NodeStats = await NodeStats.getNodeStatsById(nodeId)
            if (existingNodeStats) {
              /* prettier-ignore */ if (config.verbose) console.log(`existingNodeStats: `, existingNodeStats)
              // node statistics exists, update node statistics record
              const updatedNodeStats = updateNodeStats(
                existingNodeStats,
                { state: nodeState },
                cycle.cycleRecord.start
              )
              /* prettier-ignore */ if (config.verbose) console.log(`updatedNodeStats: `, updatedNodeStats)
              await NodeStats.insertOrUpdateNodeStats(updatedNodeStats)
              updatedNodeStatsCombined.push(updatedNodeStats)
            } else {
              console.warn(
                `Node statistics record not found for node with Id: ${nodeId} and state ${nodeState}`
              )
            }
          }
          pubKeyToStateMap.clear()
          IdToStateMap.clear()

          // Update node stats for shutdown mode
          if (cycle.cycleRecord.mode == 'shutdown') {
            NodeStats.updateAllNodeStates(cycle.cycleRecord.start)
          }
        }
      } else {
        console.error(`Failed to fetch cycleRecords between ${startCycle} and ${endCycle}`)
      }
      await insertOrUpdateMetadata(Metadata.MetadataType.NodeStats, endCycle)
      startCycle = endCycle + 1
      endCycle = endCycle + bucketSize
    }
  } catch (error) {
    console.error(`Error in recordNodeStats: ${error}`)
  }
}

export const patchStatsBetweenCycles = async (startCycle: number, endCycle: number): Promise<void> => {
  await recordOldValidatorsStats(endCycle, startCycle - 1)
  await recordTransactionsStats(endCycle, startCycle - 1)
  await recordCoinStats(endCycle, startCycle - 1)
  await recordNodeStats(endCycle, startCycle - 1)
}

export async function insertOrUpdateMetadata(
  type: Metadata.MetadataType,
  latestCycleNumber: number
): Promise<void> {
  await Metadata.insertOrUpdateMetadata({ type, cycleNumber: latestCycleNumber })
}
