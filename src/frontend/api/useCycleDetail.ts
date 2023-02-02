import useSWR from "swr";
import { Cycle } from "../types";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useCycleDetail = (id: string | number) => {
  const { data } = useSWR(`${PATHS.CYCLE}/${id}`, fetcher);

  const cycle = data?.cycle as Cycle;

  return {
    data: cycle,
  };
};
