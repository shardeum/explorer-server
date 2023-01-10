import useSWR from "swr";
import { Transaction, TransactionQuery } from "../types";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useTransaction = (query: TransactionQuery) => {
  const { page, count, txType } = query;

  const createUrl = () => {
    let url = `${PATHS.TRANSACTION}?page=${page}`;

    if (count) url = `${PATHS.TRANSACTION}?count=${count}`;
    if (txType) {
      url += `&txType=${txType}`;
    }
    return url;
  };

  const { data } = useSWR(createUrl(), fetcher);

  const transactions: Transaction[] = data?.transactions || [];

  const res = {
    transactions,
    totalPages: data?.totalPages || 0,
    totalTransactions: data?.totalTransactions || 0,
    totalRewardTxs: data?.totalRewardTxs || 0,
    loading: !data,
  };

  return res;
};
