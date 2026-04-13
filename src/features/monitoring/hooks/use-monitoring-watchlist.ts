import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { monitoringApi } from "../monitoring.api";
import type { MonitoringWatchlistToken } from "../monitoring.types";

const WATCHLIST_QUERY_KEY = ["monitoring", "watchlist"] as const;

export const useMonitoringWatchlist = () => {
  return useQuery({
    queryKey: WATCHLIST_QUERY_KEY,
    queryFn: () => monitoringApi.getWatchlist(),
    refetchOnWindowFocus: false,
  });
};

export const useReplaceMonitoringWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokens: MonitoringWatchlistToken[]) => monitoringApi.replaceWatchlist(tokens),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["monitoring", "overview"] });
      void queryClient.invalidateQueries({ queryKey: ["monitoring", "signals"] });
    },
  });
};
