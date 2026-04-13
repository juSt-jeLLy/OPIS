import { MONITORING_API_BASE } from "./monitoring.constants";
import type {
  MonitoringAlertsResponse,
  MonitoringOverviewResponse,
  MonitoringSignalsResponse,
  MonitoringTokensResponse,
  MonitoringWatchlistResponse,
  MonitoringWatchlistToken,
} from "./monitoring.types";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${MONITORING_API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Monitoring API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const monitoringApi = {
  getOverview: (): Promise<MonitoringOverviewResponse> => request<MonitoringOverviewResponse>("/overview"),
  getSignals: (): Promise<MonitoringSignalsResponse> => request<MonitoringSignalsResponse>("/signals"),
  getAlerts: (): Promise<MonitoringAlertsResponse> => request<MonitoringAlertsResponse>("/alerts"),
  getWatchlist: (): Promise<MonitoringWatchlistResponse> => request<MonitoringWatchlistResponse>("/watchlist"),
  searchTokens: (query: string, chain: string, limit = 30): Promise<MonitoringTokensResponse> =>
    request<MonitoringTokensResponse>(
      `/tokens?${new URLSearchParams({
        q: query,
        chain,
        limit: String(limit),
      }).toString()}`,
    ),
  replaceWatchlist: (tokens: MonitoringWatchlistToken[]): Promise<MonitoringWatchlistResponse> =>
    request<MonitoringWatchlistResponse>("/watchlist", {
      method: "POST",
      body: JSON.stringify({ tokens }),
    }),
  runCycle: (): Promise<void> => request<void>("/run-cycle", { method: "POST" }),
};
