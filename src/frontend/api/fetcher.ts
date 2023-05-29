import { api } from './axios'

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await api.get<T>(url)
  return response.data
}
