import * as socketClient from 'socket.io-client'
import { config } from '../config'
import { Data, NewData } from './types'

export const setupCollectorListener = async (): Promise<void> => {
  const socket = socketClient.connect(`http://${config.host}:${config.port.collector_distributor_sender}`, {
    reconnection: true,
    reconnectionAttempts: 10,
  })

  // Register default socket event handlers
  socket.on('connect', () => console.log('Connected to distributor sender'))
  socket.on('disconnect', () => console.log('Disconnected from distributor sender'))
  socket.on('error', (err) => console.log(`Error from distributor sender: ${err}`))

  // Register custom socket event handlers
  socket.on('data/cycle', cycleDataHandler)
  socket.on('data/receipt', receiptDataHandler)
}

const cycleDataHandler = async (data: Data): Promise<void> => {
  /*prettier-ignore*/ console.log('Received archived cycle data, valid? ', data.archivedCycles && data.archivedCycles[0] && data.archivedCycles[0].cycleRecord && data.archivedCycles[0].cycleRecord.counter)
  console.log(`Cycle data: ${JSON.stringify(data, null, 2)}`)
}

const receiptDataHandler = async (data: NewData): Promise<void> => {
  /*prettier-ignore*/ console.log('Received receipt data, valid?', data.receipts && data.receipts[0] && data.receipts[0].receipt && data.receipts[0].receipt.cycle)
  console.log(`Receipt data: ${JSON.stringify(data, null, 2)}`)
}
