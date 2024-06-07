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

api.interceptors.response.use(
  response => {
    if (response.data && typeof response.data === 'string') {
      response.data = JSON.parse(response.data, bigIntReviver);
    } else if (response.data) {
      // If axios already parsed it
      response.data = JSON.parse(JSON.stringify(response.data), bigIntReviver);
    }
    return response;
  },
  error => {
    console.log(error);
    return Promise.reject(error);
  }
);

function bigIntReviver(key, value) {
  if (typeof value === 'object' && value !== null && 'dataType' in value && value.dataType === 'bi') {
      return value.value;
  }
  return value;
}

export { api }
