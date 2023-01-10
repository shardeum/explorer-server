import { useCallback, useEffect, useMemo, useState } from "react";
import { api, PATHS } from "../../api";
import { Cycle } from "../../types";

export const useCycleHook = () => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalCycle, setTotalCycle] = useState<number>(0);
  const limit = 10;

  const getLatestCounter = useCallback(async () => {
    const data = await api.get(`${PATHS.CYCLE}?count=1`);

    const cycle: Cycle = data?.data?.cycles?.[0];

    const counter = cycle?.cycleRecord?.counter;

    const to = counter - (page - 1) * limit;

    const from = to - limit + 1;

    return { counter, to, from };
  }, [page]);

  useEffect(() => {
    async function fetchData() {
      const { counter, to, from } = await getLatestCounter();

      const data = await api.get(`${PATHS.CYCLE}?from=${from}&to=${to}`);

      setCycles((data?.data?.cycles as Cycle[]) || []);
      setTotalCycle(counter);
    }

    fetchData();
  }, [getLatestCounter]);

  return {
    cycles,
    loading: !cycles,
    page,
    limit,
    setPage,
    totalCycle,
  };
};
