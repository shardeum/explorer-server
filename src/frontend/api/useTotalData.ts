import useSWR from "swr";
import { fetcher } from "./fetcher";
import { PATHS } from "./paths";

export const useTotalData = () => {
  const { data } = useSWR(PATHS.TOTAL_DATA, fetcher);

  return {
    data,
  };
};
