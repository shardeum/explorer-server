import { useRouter } from 'next/router'
import { useCallback, useState } from 'react'
import { isTransactionHash, isNodeAccount } from '../../utils/getSearchRoute'

type SearchHookResult = {
  search: string
  setSearch: (search: string) => void
  onSearch: () => void
}

export const useSearchHook = (): SearchHookResult => {
  const router = useRouter()

  const [search, setSearch] = useState<string>('')

  const onSearch = useCallback(async () => {
    const searchText = search.trim().toLowerCase()

    const regex = /[a-z]/i

    if (searchText.length === 42) {
      console.log('42')
      router.push(`/account/${searchText}`)
    }
    if (searchText.length === 66) {
      console.log('66')
      router.push(`/transaction/${searchText}`)
    }
    if (searchText.length === 64) {
      if (await isTransactionHash(searchText)) router.push(`/transaction/0x${searchText}`)
      else if (await isNodeAccount(searchText)) router.push(`/account/${searchText}`)
      else router.push(`/cycle/${searchText}`)
    }
    // Regex to check if the search text is a cycle number
    if (!regex.test(searchText)) {
      router.push(`/cycle/${searchText}`)
      console.log('regex')
    }
  }, [router, search])

  return {
    search,
    setSearch,
    onSearch,
  }
}
