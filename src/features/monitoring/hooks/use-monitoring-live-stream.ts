import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MONITORING_API_BASE } from "../monitoring.constants";
import type { MonitoringOverviewResponse } from "../monitoring.types";

const LIVE_INVALIDATE_COOLDOWN_MS = 1_500;

export const useMonitoringLiveStream = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let lastInvalidateAt = 0;
    const source = new EventSource(`${MONITORING_API_BASE}/stream`);

    source.onmessage = (event) => {
      try {
        const overview = JSON.parse(event.data) as MonitoringOverviewResponse;
        queryClient.setQueryData(["monitoring", "overview"], overview);
      } catch {
        return;
      }

      const now = Date.now();
      if (now - lastInvalidateAt < LIVE_INVALIDATE_COOLDOWN_MS) {
        return;
      }

      lastInvalidateAt = now;
      void queryClient.invalidateQueries({ queryKey: ["monitoring", "signals"] });
      void queryClient.invalidateQueries({ queryKey: ["monitoring", "watchlist"] });
    };

    source.onerror = () => {
      // Browser EventSource reconnects automatically.
    };

    return () => {
      source.close();
    };
  }, [queryClient]);
};
