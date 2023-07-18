import fastifyRateLimit from '@fastify/rate-limit'
import FastifyWebsocket, { SocketStream } from '@fastify/websocket'
import * as crypto from 'crypto'
import Fastify from 'fastify'
import { config } from './config'
import { evmLogDiscovery, removeLogSubscriptionBySocketId } from './distributor/'
import { setupCollectorListener } from './distributor/CollectorListener'
import { socketClient, socketHandlers } from './distributor/WebSocket'
import * as Storage from './storage'

const start = async (): Promise<void> => {
  // Init dependencies
  await Storage.initializeDB()
  await setupCollectorListener()

  // Init server
  const server = Fastify({
    logger: true,
  })

  // Register plugins and middleware
  await server.register(FastifyWebsocket, {
    errorHandler: (error, connection, request, reply) => {
      server.log.error(`Error processing websocket request ${request.id}. Error ${error}`)
      reply.send({ error: error.message })
      connection.destroy(error)
    },
  })
  await server.register(fastifyRateLimit, {
    max: config.rateLimit,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', 'localhost'],
  })
  server.setErrorHandler((error, request, reply) => {
    server.log.error(`Error processing request ${request.id}. Error ${error}`)
    reply.send({ error: error.message })
  })

  // Register handler
  server.get('/evm_log_subscription', { websocket: true }, evmLogSubscriptionHandler)

  // Start server
  server.listen(
    {
      port: Number(config.port.distributor),
      host: '0.0.0.0',
    },
    async (err) => {
      if (err) {
        server.log.error(`Error starting distributor on port ${config.port.distributor}. Error ${err}`)
        throw err
      }
      console.log('Distributor server is listening on port:', config.port.distributor)
      setInterval(evmLogDiscovery, 15 * 1000)
    }
  )
}

const evmLogSubscriptionHandler = (connection: SocketStream): void => {
  let socket_id = crypto.randomBytes(32).toString('hex')
  socket_id = crypto.createHash('sha256').update(socket_id).digest().toString('hex')
  socketClient.set(socket_id, connection)

  connection.socket.on('message', (message) => {
    try {
      const payload = JSON.parse(message.toString())
      socketHandlers.onMessage(connection, payload, socket_id)
      return
    } catch (e) {
      connection.socket.send(JSON.stringify({ error: e.message }))
      return
    }
  })
  connection.socket.on('close', () => {
    try {
      removeLogSubscriptionBySocketId(socket_id)
      socketClient.delete(socket_id)
    } catch (e) {
      console.error(e)
    }
  })
}

start()
