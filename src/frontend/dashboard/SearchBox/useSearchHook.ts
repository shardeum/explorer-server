import { useRouter } from "next/router";
import { useCallback, useState } from "react";

export const useSearchHook = () => {
  const router = useRouter();

  const [search, setSearch] = useState<string>("");

  const onSearch = useCallback(() => {
    const searchText = search.trim().toLowerCase();

    const regex = /[a-z]/i;

    if (searchText.length === 42) {
      console.log("42");
      router.push(`/account/${searchText}`);
    }
    if (searchText.length === 66) {
      console.log("66");
      router.push(`/transaction/${searchText}`);
    }
    if (searchText.length === 64) {
      console.log("64");
      router.push(`/transaction/${searchText}`);
    }
    if (!regex.test(searchText)) {
      router.push(`/cycle/${searchText}`);
      console.log("regex");
    }
  }, [router, search]);

  return {
    search,
    setSearch,
    onSearch,
  };
};
