import { useQuery } from "@tanstack/react-query";
import { monitoringApi } from "../monitoring.api";

export const useMonitoringOverview = () => {
  return useQuery({
    queryKey: ["monitoring", "overview"],
    queryFn: () => monitoringApi.getOverview(),
    refetchOnWindowFocus: false,
  });
};
