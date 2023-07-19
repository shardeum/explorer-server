import { SocketStream } from '@fastify/websocket'
import { addLogSubscriptions, removeLogSubscription } from './SocketManager'

interface BaseRequest {
  method: string
  subscription_id: string
}

const validateBaseRequest = (request: unknown): [idValid: boolean, errorMsg: string] => {
  if (typeof request !== 'object' || request === null) {
    return [false, 'Request must be an object.']
  }
  const req = request as Partial<BaseRequest>
  if (typeof req.method !== 'string') {
    return [false, 'method must be a string.']
  }
  if (typeof req.subscription_id !== 'string') {
    return [false, 'subscription_id must be a string.']
  }
  return [true, '']
}

export interface SubscribeRequest extends BaseRequest {
  address: string
  topics: string[]
}

const validateSubscribeRequest = (request: unknown): [idValid: boolean, errorMsg: string] => {
  if (typeof request !== 'object' || request === null) {
    return [false, 'Request must be an object.']
  }
  const req = request as Partial<SubscribeRequest>
  if (typeof req.method !== 'string') {
    return [false, 'method must be a string.']
  }
  if (typeof req.subscription_id !== 'string') {
    return [false, 'subscription_id must be a string.']
  }
  if (typeof req.address !== 'string') {
    return [false, 'address must be a string.']
  }
  if (!Array.isArray(req.topics) || !req.topics.every((topic) => typeof topic === 'string')) {
    return [false, 'topics must be an array of strings.']
  }
  return [true, '']
}

export const evmLogSubscriptionHandler = {
  onMessage: async function (conn: SocketStream, message: unknown, socketId: string) {
    const [idValid, errorMsg] = validateBaseRequest(message)
    if (!idValid) {
      console.log(`Invalid request: ${errorMsg}, message: ${JSON.stringify(message)}`)
      conn.socket.send(JSON.stringify({ success: false, error: errorMsg }))
      return
    }
    const request = message as BaseRequest

    switch (request.method) {
      case 'subscribe': {
        const [idValid, errorMsg] = validateSubscribeRequest(request)
        if (!idValid) {
          conn.socket.send(JSON.stringify({ method: 'subscribe', success: false, error: errorMsg }))
          return
        }
        const subscribeRequest = request as SubscribeRequest
        addLogSubscriptions(subscribeRequest.subscription_id, socketId, {
          address: subscribeRequest.address,
          topics: subscribeRequest.topics,
        })
        conn.socket.send(
          JSON.stringify({
            method: 'subscribe',
            success: true,
            subscription_id: subscribeRequest.subscription_id,
          })
        )
        return
      }
      case 'unsubscribe': {
        removeLogSubscription(request.subscription_id)
        conn.socket.send(
          JSON.stringify({
            method: 'unsubscribe',
            success: true,
            subscription_id: request.subscription_id,
          })
        )
        return
      }
      default:
        conn.socket.send(JSON.stringify({ success: false, error: 'invalid method' }))
        return
    }
  },
}
