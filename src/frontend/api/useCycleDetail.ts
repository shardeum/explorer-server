import useSWR, { SWRResponse } from 'swr'
import { Cycle } from '../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export const useCycleDetail = (id: string) => {
  let cycleNumber
  const regex = /[a-z]/i
  if (!regex.test(id)) {
    cycleNumber = id
  }
  let response
  let cycle
  if (cycleNumber) {
    response = useSWR(`${PATHS.CYCLE}/${id}`, fetcher)
    cycle = response?.data?.cycle as Cycle
  } else {
    response = useSWR(`${PATHS.CYCLE}?marker=${id}`, fetcher)
    cycle = response?.data?.cycles[0] as Cycle
  }

  return {
    data: cycle,
  }
}
