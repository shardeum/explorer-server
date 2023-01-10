import { useCallback, useEffect, useState } from "react";
import { api, PATHS } from "../api";
import {
  Account,
  AccountSearchType,
  Token,
  Transaction,
  TransactionSearchType,
} from "../types";

interface detailProps {
  id: string;
  address?: string;
}

export const useTokenHook = ({ id, address }: detailProps) => {
  const [account, setAccount] = useState<Account>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokenHolders, setTokenHolders] = useState<number>(0);
  const [total, setTotal] = useState<number>();
  const [page, setPage] = useState<number>(1);
  const [transactionType, setTransactionType] = useState<number | string>(
    TransactionSearchType.TokenTransfer
  );

  const accountType =
    id && id.length === 64
      ? AccountSearchType.NodeAccount
      : AccountSearchType.All; // TODO: I think it has to be EOA

  const getAddress = useCallback(async () => {
    const data = await api.get(
      `${PATHS.ADDRESS}?address=${id}&accountType=${accountType}`
    );

    return data?.data?.accounts as Account[];
  }, [accountType, id]);

  const getTransaction = useCallback(async () => {
    let url = `${PATHS.TRANSACTION}?address=${id}&page=${page}&txType=${transactionType}`;

    if (address) {
      url += `filterAddress${address}`;
    }

    const data = await api.get(url);

    return {
      transactions: data?.data?.transactions as Transaction[],
      total: data?.data?.totalTransactions,
    };
  }, [address, id, page, transactionType]);

  const getToken = useCallback(async () => {
    const data = await api.get(`${PATHS.TOKEN}?contractAddress=${id}`);

    return {
      tokenHolders: data?.data?.totalTokenHolders,
    };
  }, [address, id]);

  useEffect(() => {
    async function fetchData() {
      const accounts = await getAddress();

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        const { total, transactions } = await getTransaction();

        setTransactions(transactions as Transaction[]);
        setTotal(total);
        setAccount(accounts[0]);
      }

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        const { tokenHolders } = await getToken();
        setTokenHolders(tokenHolders);
      }
    }

    fetchData();
  }, [getAddress, getTransaction]);

  return {
    account,
    transactions,
    tokenHolders,
    total,
    page,
    setPage,
    transactionType,
    setTransactionType,
  };
};
