import { useCallback, useEffect, useState } from 'react'
import debounce from 'lodash/debounce'

import { api } from './axios'

interface Response {
  lists: unknown[]
  count: number
}

type Filters = {
  [key: string]: string | number
}

interface useListParam {
  path: string
  filters?: Filters
}

export const useList = (param: useListParam) => {
  const { path, filters = {} } = param

  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(10)
  const [filter, setFilter] = useState<Filters>(filters as Filters)
  const [responeData, setResponseData] = useState<Response>()
  const [error, setError] = useState()

  async function fetchData() {
    try {
      const lists = await api.get(path, {
        params: { ...filter, page, limit },
        // paramsSerializer(params) {
        //   return qs.stringify(params);
        // },
      })
      if (lists.status === 200) setResponseData(lists.data?.data)
    } catch (error) {
      console.log(error)
      setError(error)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceFetch = useCallback(debounce(fetchData, 500, { maxWait: 500 }), [path, filter, page, limit])

  useEffect(() => {
    debounceFetch()

    return debounceFetch.cancel
  }, [path, filter, debounceFetch, page, limit])

  return {
    page,
    setPage,

    limit,
    setLimit,

    filter,
    setFilter,

    data: responeData?.lists || [],
    total: responeData?.count,
    loading: !responeData,
    error,
  }
}
