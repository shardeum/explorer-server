import {
  ChangeEvent,
  ChangeEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { api, PATHS } from "../api";
import {
  Account,
  AccountSearchType,
  Token,
  Transaction,
  TransactionSearchType,
} from "../types";
import { Tokens } from "../types/transaction";

interface detailProps {
  id: string;
  address?: string;
}

export const useTokenHook = ({ id, address }: detailProps) => {
  const [account, setAccount] = useState<Account>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokens, setTokens] = useState<Tokens[]>([]);
  const [tokenHolders, setTokenHolders] = useState<number>(0);
  const [total, setTotal] = useState<number>();
  const [page, setPage] = useState<number>(1);
  const [transactionType, setTransactionType] = useState<number | string>(
    TransactionSearchType.TokenTransfer
  );
  const [filteredAddress, setFilteredAddress] = useState<string>("");
  const [activeTab, setActiveTab] = useState(0);
  const [tokenBalance, setTokenBalance] = useState<string>("");

  const accountType =
    id && id.length === 64
      ? AccountSearchType.NodeAccount
      : AccountSearchType.All; // TODO: I think it has to be EOA

  const onAddressChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFilteredAddress(e.target.value);
  }, []);

  const onTabChange = useCallback((tab: any) => {
    setActiveTab(tab);
  }, []);

  const getAddress = useCallback(async () => {
    const data = await api.get(
      `${PATHS.ADDRESS}?address=${id}&accountType=${accountType}`
    );

    return data?.data?.accounts as Account[];
  }, [accountType, id]);

  const getTransaction = useCallback(async () => {
    let url = `${PATHS.TRANSACTION}?address=${id}&page=${page}&txType=${transactionType}`;

    if (filteredAddress) {
      url += `&filterAddress=${filteredAddress}`;
    }

    const data = await api.get(url);

    return {
      transactions: data?.data?.transactions as Transaction[],
      total: data?.data?.totalTransactions,
      tokenBalance: data?.data?.filterAddressTokenBalance,
    };
  }, [filteredAddress, id, page, transactionType]);

  const getToken = useCallback(async () => {
    const data = await api.get(`${PATHS.TOKEN}?contractAddress=${id}&page=1`);

    return {
      tokenHolders: data?.data?.totalTokenHolders,
      tokens: data?.data?.tokens,
    };
  }, [id]);

  useEffect(() => {
    async function fetchData() {
      const accounts = await getAddress();

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        const { total, transactions, tokenBalance } = await getTransaction();

        setTransactions(transactions as Transaction[]);
        setTotal(total);
        setAccount(accounts[0]);
        setTokenBalance(tokenBalance);
      }

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        const { tokenHolders, tokens } = await getToken();
        setTokenHolders(tokenHolders);
        setTokens(tokens as Tokens[]);
      }
    }

    fetchData();
  }, [getAddress, getTransaction]);

  useEffect(() => {
    if (address) {
      setFilteredAddress(address);
    }
  }, [address]);

  return {
    account,
    transactions,
    tokenHolders,
    tokens,
    total,
    page,
    setPage,
    transactionType,
    setTransactionType,
    filteredAddress,
    onAddressChange,
    activeTab,
    onTabChange,
    tokenBalance,
  };
};
