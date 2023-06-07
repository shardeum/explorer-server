import useSWR from 'swr'
import { CycleQuery } from '../types'
import { Cycle } from '../../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export type CycleResult = {
  data: Cycle[]
  loading: boolean
}

export const useCycle = (query: CycleQuery): CycleResult => {
  const { count } = query

  const { data } = useSWR<{ cycles: Cycle[] }>(`${PATHS.CYCLE}?count=${count}`, fetcher)

  return {
    data: data?.cycles || [],
    loading: !data,
  }
}
