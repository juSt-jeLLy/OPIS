import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { monitoringApi } from "../monitoring.api";
import type { MonitoringLiveStreamEvent, MonitoringSignalsResponse } from "../monitoring.types";

const LIVE_INVALIDATE_COOLDOWN_MS = 1_500;

export const useMonitoringLiveStream = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let lastInvalidateAt = 0;
    const source = new EventSource(monitoringApi.streamUrl());

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as MonitoringLiveStreamEvent | MonitoringSignalsResponse;
        if ("overview" in payload) {
          queryClient.setQueryData(["monitoring", "overview"], payload.overview);
          queryClient.setQueryData<MonitoringSignalsResponse>(["monitoring", "signals"], {
            signals: payload.signals,
          });
        }
      } catch {
        return;
      }

      const now = Date.now();
      if (now - lastInvalidateAt < LIVE_INVALIDATE_COOLDOWN_MS) {
        return;
      }

      lastInvalidateAt = now;
      void queryClient.invalidateQueries({ queryKey: ["monitoring", "watchlist"] });
      void queryClient.invalidateQueries({ queryKey: ["trading", "actions"] });
      void queryClient.invalidateQueries({ queryKey: ["trading", "trades"] });
    };

    source.onerror = () => {
      // Browser EventSource reconnects automatically.
    };

    return () => {
      source.close();
    };
  }, [queryClient]);
};
