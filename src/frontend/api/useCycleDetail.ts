import useSWR from 'swr'
import { Cycle } from '../../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

type CycleDetailResult = {
  data: Cycle | null
}

export const useCycleDetail = (id: string): CycleDetailResult => {
  let cycleNumber: string | null = null
  const regex = /[a-z]/i
  if (!regex.test(id)) {
    cycleNumber = id
  }

  const queryPath = cycleNumber ? `${PATHS.CYCLE}?cycleNumber=${id}` : `${PATHS.CYCLE}?marker=${id}`
  const response = useSWR<{ cycle: Cycle; cycles: Cycle[] }>(queryPath, fetcher)

  const cycle: Cycle | null = response.data?.cycles[0] || null

  return {
    data: cycle,
  }
}
