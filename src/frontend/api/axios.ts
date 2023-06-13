import axios from 'axios'

import { PATHS } from './paths'

const api = axios.create({
  baseURL: PATHS.BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    console.log(error)
  }
)

api.interceptors.response.use(
  (config) => {
    return config
  },
  (error) => {
    console.log(error)
    return error
  }
)

export { api }
