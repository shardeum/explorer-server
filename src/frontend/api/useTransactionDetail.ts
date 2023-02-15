import useSWR from "swr";
import { Transaction } from "../types";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useTransactionDetail = (id: string) => {
  const { data } = useSWR(`${PATHS.TRANSACTION_DETAIL}?txHash=${id}&type=requery`, fetcher);

  const transactions = data?.transactions;

  return {
    data: transactions?.[0] as Transaction,
  };
};
