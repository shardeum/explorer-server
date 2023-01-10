import { useCallback, useEffect, useMemo, useState } from "react";
import { api, PATHS } from "../../api";
import {
  Account,
  AccountSearchType,
  Token,
  Transaction,
  TransactionSearchType,
} from "../../types";

interface detailProps {
  id: string;
  txType?: TransactionSearchType;
}

export const useAccountDetailHook = ({ id, txType }: detailProps) => {
  const [account, setAccount] = useState<Account>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [total, setTotal] = useState<number>();
  const [page, setPage] = useState<number>(1);
  const [transactionType, setTransactionType] = useState<TransactionSearchType>(
    txType || TransactionSearchType.All
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
    const data = await api.get(
      `${PATHS.TRANSACTION}?address=${id}&page=${page}&txType=${transactionType}`
    );

    return {
      transactions: data?.data?.transactions as Transaction[],
      total: data?.data?.totalTransactions,
    };
  }, [id, page, transactionType]);

  const getToken = useCallback(async () => {
    const data = await api.get(`${PATHS.TOKEN}?address=${id}`);

    return {
      tokens: data?.data?.tokens,
    };
  }, [accountType, id]);

  useEffect(() => {
    setTransactions([]);
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
        const { tokens } = await getToken();
        setTokens(tokens);
      }
    }

    fetchData();
  }, [getAddress, getTransaction]);

  return {
    account,
    transactions,
    tokens,
    total,
    page,
    setPage,
    transactionType,
    setTransactionType,
  };
};
