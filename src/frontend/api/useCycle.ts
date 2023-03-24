import useSWR from "swr";
import { CycleQuery, Cycle } from "../types";
import { api } from "./axios";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useCycle = (query: CycleQuery) => {
  const { count } = query;

  // console.log(fetcher, `${PATHS.CYCLE}?count=${count}`);

  const { data } = useSWR(`${PATHS.CYCLE}?count=${count}`, fetcher);
  // console.log("data", data);

  const cycles: Cycle[] = data?.cycles || [];

  return {
    data: cycles,
    loading: !data,
  };
};
