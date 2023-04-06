import useSWR from 'swr'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export const useAccountDetail = (id: string | number) => {
  useSWR(`${PATHS.ADDRESS}?address=${id}&accountType=0`, fetcher)

  return {}
}
