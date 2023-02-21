import useSWR from "swr";
import { api } from "./axios";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useStats = (query: any) => {
    const { count } = query;

    // console.log(fetcher, `${PATHS.STATS_VALIDATOR}?count=${count}&responseType=array`);

    const { data } = useSWR(`${PATHS.STATS_VALIDATOR}?count=${count}&responseType=array`, fetcher);
    // console.log("data", data);

    const validatorStats: any[] = data?.validatorStats || [];

    const response = useSWR(`${PATHS.STATS_TRANSACTION}?count=${count}&responseType=array`, fetcher);
    // console.log("data", data);

    const transactionStats: any[] = response?.data?.transactionStats || [];

    return {
        validatorStats,
        transactionStats,
        loading: !data,
    };
};