import useSWR from "swr";
import { CycleQuery, Cycle } from "../types";
import { api } from "./axios";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useCycle = (query: CycleQuery) => {
  const { count } = query;

  const { data } = useSWR(`${PATHS.CYCLE}?count=${count}`, fetcher);

  const cycles: Cycle[] = data?.cycles || [];

  return {
    data: cycles,
    loading: !data,
  };
};
