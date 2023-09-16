import { SocketStream } from '@fastify/websocket'
import { addLogSocketClient, addLogSubscriptions, removeLogSubscription } from './SocketManager'

interface BaseRequest {
  method: string
}

const validateBaseRequest = (request: unknown): [idValid: boolean, errorMsg: string] => {
  if (typeof request !== 'object' || request === null) {
    return [false, 'Request must be an object.']
  }
  const req = request as Partial<BaseRequest>
  if (typeof req.method !== 'string') {
    return [false, 'method must be a string.']
  }
  return [true, '']
}

interface SubscribeRequest extends BaseRequest {
  params: {
    subscription_id: string
    address: string[]
    topics: string[]
  }
}

const validateSubscribeRequest = (request: unknown): [idValid: boolean, errorMsg: string] => {
  if (typeof request !== 'object' || request === null) {
    return [false, 'Request must be an object.']
  }
  const req = request as Partial<SubscribeRequest>
  if (typeof req.params !== 'object' || req.params === null) {
    return [false, 'params must be an object.']
  }
  const params = req.params as Partial<SubscribeRequest['params']>
  if (typeof params.subscription_id !== 'string') {
    return [false, 'params.subscription_id must be a string.']
  }
  if (params.address === undefined && params.topics === undefined) {
    return [false, 'params.address or params.topics must be provided.']
  }
  if (params.address !== undefined && !Array.isArray(params.address)) {
    return [false, 'params.address must be an array of strings.']
  }
  if (params.address !== undefined && params.address.some((addr) => typeof addr !== 'string')) {
    return [false, 'params.address must be an array of strings.']
  }
  if (params.topics !== undefined && !Array.isArray(params.topics)) {
    return [false, 'params.topics must be an array.']
  }
  if (params.topics !== undefined && params.topics.some((topic) => typeof topic !== 'string')) {
    return [false, 'params.topics must be an array of strings.']
  }
  return [true, '']
}

interface UnsubscribeRequest extends BaseRequest {
  params: {
    subscription_id: string
  }
}

const validateUnsubscribeRequest = (request: unknown): [idValid: boolean, errorMsg: string] => {
  if (typeof request !== 'object' || request === null) {
    return [false, 'Request must be an object.']
  }
  const req = request as Partial<UnsubscribeRequest>
  if (typeof req.params !== 'object' || req.params === null) {
    return [false, 'params must be an object.']
  }
  const params = req.params as Partial<UnsubscribeRequest['params']>
  if (typeof params.subscription_id !== 'string') {
    return [false, 'params.subscription_id must be a string.']
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
          console.log(`Invalid subscribe request: ${errorMsg}, message: ${JSON.stringify(message)}`)
          conn.socket.send(JSON.stringify({ method: 'subscribe', success: false, error: errorMsg }))
          return
        }
        const subscribeRequest = request as SubscribeRequest
        addLogSubscriptions(subscribeRequest.params.subscription_id, socketId, {
          address: Array.from(subscribeRequest.params.address || []).map((addr) => addr.toLowerCase()),
          topics: Array.from(subscribeRequest.params.topics || []).map((topic) => topic.toLowerCase()),
        })
        conn.socket.send(
          JSON.stringify({
            method: 'subscribe',
            success: true,
            subscription_id: subscribeRequest.params.subscription_id,
          })
        )
        addLogSocketClient(socketId, conn)
        return
      }
      case 'unsubscribe': {
        const [idValid, errorMsg] = validateUnsubscribeRequest(request)
        if (!idValid) {
          console.log(`Invalid unsubscribe request: ${errorMsg}, message: ${JSON.stringify(message)}`)
          conn.socket.send(JSON.stringify({ method: 'unsubscribe', success: false, error: errorMsg }))
          return
        }
        const unsubscribeRequest = request as UnsubscribeRequest
        removeLogSubscription(unsubscribeRequest.params.subscription_id)
        conn.socket.send(
          JSON.stringify({
            method: 'unsubscribe',
            success: true,
            subscription_id: unsubscribeRequest.params.subscription_id,
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
