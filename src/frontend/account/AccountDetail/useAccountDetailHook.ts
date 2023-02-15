import { useCallback, useEffect, useMemo, useState } from "react";
import { api, PATHS } from "../../api";
import {
  Account,
  AccountType,
  ContractType,
  Token,
  Transaction,
  TransactionSearchType,
} from "../../types";
import Web3Utils from "web3-utils";
import { formatUnits } from "ethers";

interface detailProps {
  id: string;
  txType?: TransactionSearchType;
}

export const useAccountDetailHook = ({ id, txType }: detailProps) => {
  const [account, setAccount] = useState<Account>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [page, setPage] = useState<number>(1);
  const [transactionType, setTransactionType] = useState<TransactionSearchType>(
    txType || TransactionSearchType.All
  );

  const accountType =
    id && id.length === 64 ? AccountType.NodeAccount2 : AccountType.Account; // TODO: I think it has to be EOA

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
      totalTransactions: data?.data?.totalTransactions,
      totalPages: data?.data?.totalPages,
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
    setAccount(undefined);
    async function fetchData() {
      const accounts = await getAddress();

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        const { totalTransactions, transactions } = await getTransaction();

        setTransactions(transactions as Transaction[]);
        setTotalTransactions(totalTransactions);
        setAccount(accounts[0]);
        setTotalPages(totalPages);
      }

      if (accountType === AccountType.Account) {
        if (
          (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
          (accounts && accounts.length > 0 && accounts[0].accountId)
        ) {
          let { tokens } = await getToken();
          if (tokens.length > 0) {
            tokens.forEach((item) => {
              if (item.contractType === ContractType.ERC_20) {
                let decimalsValue = 18;
                if (item.contractInfo.decimals) {
                  decimalsValue = parseInt(item.contractInfo.decimals);
                }
                item.balance = formatUnits(item.balance, decimalsValue);
              }
            });
          }
          setTokens(tokens);
        }
      }
    }

    fetchData();
  }, [id, getAddress, getTransaction]);

  return {
    account,
    accountType,
    transactions,
    tokens,
    totalTransactions,
    totalPages,
    page,
    setPage,
    transactionType,
    setTransactionType,
  };
};
