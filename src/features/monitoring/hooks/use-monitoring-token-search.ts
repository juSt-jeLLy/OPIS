import { useQuery } from "@tanstack/react-query";
import { monitoringApi } from "../monitoring.api";
import type { MonitoringChain } from "../monitoring.types";

export const useMonitoringTokenSearch = (query: string, chain: MonitoringChain | "all", enabled = true) => {
  return useQuery({
    queryKey: ["monitoring", "tokens", query, chain],
    queryFn: () => monitoringApi.searchTokens(query, chain, 40),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
};
