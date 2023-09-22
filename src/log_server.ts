import fastifyRateLimit from '@fastify/rate-limit'
import FastifyWebsocket, { SocketStream } from '@fastify/websocket'
import * as crypto from 'crypto'
import Fastify from 'fastify'
import { config } from './config'
import { setupCollectorListener } from './logSubscription/CollectorListener'
import { evmLogSubscriptionHandler } from './logSubscription/Handler'
import { removeLogSubscriptionBySocketId } from './logSubscription/SocketManager'
import * as Storage from './storage'

const start = async (): Promise<void> => {
  // Init dependencies
  await Storage.initializeDB()
  await setupCollectorListener()

  // Init server
  const server = Fastify({
    logger: false,
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
  server.get('/evm_log_subscription', { websocket: true }, evmLogSubscriptionController)

  // Start server
  server.listen(
    {
      port: Number(config.port.log_server),
      host: '0.0.0.0',
    },
    async (err) => {
      if (err) {
        server.log.error(`Error starting Log server on port ${config.port.log_server}. Error ${err}`)
        throw err
      }
      console.log('Log Server is listening on port:', config.port.log_server)
    }
  )
}

const evmLogSubscriptionController = (connection: SocketStream): void => {
  let socketId = crypto.randomBytes(32).toString('hex')
  socketId = crypto.createHash('sha256').update(socketId).digest().toString('hex')

  connection.socket.on('message', (message) => {
    try {
      const payload = JSON.parse(message.toString())
      evmLogSubscriptionHandler.onMessage(connection, payload, socketId)
      return
    } catch (e) {
      connection.socket.send(JSON.stringify({ error: e.message }))
      return
    }
  })
  connection.socket.on('close', () => {
    try {
      removeLogSubscriptionBySocketId(socketId)
    } catch (e) {
      console.error(e)
    }
  })
}

start()
