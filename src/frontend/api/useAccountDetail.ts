import useSWR from "swr";
import { Cycle } from "../types";

import { fetcher } from "./fetcher";

import { PATHS } from "./paths";

export const useAccountDetail = (id: string | number) => {
  const { data } = useSWR(
    `${PATHS.ADDRESS}?address=${id}&accountType=0`,
    fetcher
  );

  //   const cycle = data?.cycle as Cycle;

  return {
    // data: cycle,
  };
};
