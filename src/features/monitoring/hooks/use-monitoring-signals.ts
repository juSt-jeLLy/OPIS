import { useQuery } from "@tanstack/react-query";
import { monitoringApi } from "../monitoring.api";

export const useMonitoringSignals = () => {
  return useQuery({
    queryKey: ["monitoring", "signals"],
    queryFn: () => monitoringApi.getSignals(),
    refetchOnWindowFocus: false,
  });
};
