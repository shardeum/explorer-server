import { Server, Socket } from 'socket.io'
import { Data, NewData } from '../class/Collector'
import { config as CONFIG } from '../config'

// constants
const ConnectionEvent = 'connection'
const DisconnectionEvent = 'disconnect'
const ErrorEvent = 'error'

const CycleDataWsEvent = '/data/cycle'
const ReceiptDataWsEvent = '/data/receipt'

const registeredDistributors = new Map<string, Socket>()

export const setupDistributorSender = (): void => {
  const socketServer = new Server()

  socketServer.on(ConnectionEvent, (socket) => {
    console.log(`New distributor registered ${socket.id}`)
    registeredDistributors[socket.id] = socket
    socket.on(DisconnectionEvent, () => {
      console.log(`Distributor ${socket.id} disconnected`)
      delete registeredDistributors[socket.id]
    })
    socket.on(ErrorEvent, (err) => {
      console.log(`Distributor ${socket.id} error: ${err}. Disconnecting...`)
      socket.disconnect()
      delete registeredDistributors[socket.id]
    })
  })

  socketServer.listen(Number(CONFIG.port.collector_distributor_sender))
  console.log(`Distributor sender listening on port ${CONFIG.port.collector_distributor_sender}`)
}

export const forwardCycleData = async (data: Data): Promise<void> => {
  for (const socket of registeredDistributors.values()) {
    socket.emit(CycleDataWsEvent, data)
  }
  console.log(`Forwarded cycle data to ${registeredDistributors.size} distributors`)
}

export const forwardReceiptData = async (data: NewData): Promise<void> => {
  for (const socket of registeredDistributors.values()) {
    socket.emit(ReceiptDataWsEvent, data)
  }
  console.log(`Forwarded receipt data to ${registeredDistributors.size} distributors`)
}
