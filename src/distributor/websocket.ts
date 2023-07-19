import { SocketStream } from '@fastify/websocket'
import { addLogSubscriptions, removeLogSubscription } from '.'

export const socketHandlers = {
  onMessage: async function (conn: SocketStream, message: any, socket_id: string) {
    let method = ''
    let subscription_id = ''

    try {
      method = message.method
      console.log('method', method)
      subscription_id = message.params.subscription_id
      console.log('subscription_id', subscription_id)
    } catch (e) {
      conn.socket.send(JSON.stringify({ error: 'missing method/subscription_id' }))
      return
    }

    if (method === 'subscribe') {
      try {
        const payload = message.params as any
        // eslint-disable-next-line prefer-const
        let { subscription_id, address, topics } = payload

        if (!subscription_id || !address || !Array.isArray(topics)) {
          throw new Error('Parameters are invalid')
        }

        if (typeof address === 'string') {
          address = [address]
        }

        if (address.length === 0 && topics.length > 0) {
          address = ['AllContracts']
        }
        console.log('adding subscription', socket_id)
        addLogSubscriptions(address, topics, subscription_id, socket_id)
        conn.socket.send(JSON.stringify({ method: 'subscribe', success: true, subscription_id }))
        return
      } catch (e: any) {
        conn.socket.send(
          JSON.stringify({ method: 'subscribe', success: false, subscription_id, error: e.message })
        )
        return
      }
    }
    if (method === 'unsubscribe') {
      try {
        removeLogSubscription(subscription_id, socket_id)
        conn.socket.send(JSON.stringify({ method: 'unsubscribe', success: true, subscription_id }))
        return
      } catch (e: any) {
        conn.socket.send(JSON.stringify({ method: 'unsubscribe', success: false, subscription_id }))
        return
      }
    }
  },
  onDisconnect: async function (conn: SocketStream, message: any) {
    return
  },
}

export const socketClient = new Map<string, SocketStream>()
