import useSWR from "swr";
import { api } from "./axios";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useStats = (query: any) => {
  const { validatorStatsCount, transactionStatsCount } = query;

  // console.log(fetcher, `${PATHS.STATS_VALIDATOR}?count=${count}&responseType=array`);
  let loading = true;

  let response;
  let validatorStats: any[] = [];
  let transactionStats: any[] = [];

  if (validatorStatsCount) {
    response = useSWR(
      `${PATHS.STATS_VALIDATOR}?count=${validatorStatsCount}&responseType=array`,
      fetcher
    );
    // console.log("data", data);

    validatorStats = response?.data?.validatorStats || [];
  }

  if (transactionStatsCount) {
    response = useSWR(
      `${PATHS.STATS_TRANSACTION}?count=${transactionStatsCount}&responseType=array`,
      fetcher
    );
    // console.log("data", data);

    transactionStats = response?.data?.transactionStats || [];
  }

  return {
    validatorStats,
    transactionStats,
    loading: !loading,
  };
};
