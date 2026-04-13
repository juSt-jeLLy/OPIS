export type MonitoringChain = "solana" | "bsc" | "eth" | "base";

export interface ModuleMetric {
  label: string;
  value: string | number;
}

export interface ModuleResult {
  score: number;
  severity: "info" | "warning" | "high" | "critical" | "opportunity";
  summary: string;
  metrics: ModuleMetric[];
}

export interface MonitoringSnapshot {
  tokenId: string;
  chain: MonitoringChain;
  symbol: string;
  name: string;
  strategy: {
    mode: "DEFENSIVE_EXIT" | "OPPORTUNITY_ENTRY" | "DCA_ACCUMULATION" | "MONITOR";
    confidence: number;
    rationale: string;
  };
  tos: {
    score: number;
    zone: "safe" | "watch" | "act";
    polarity: "threat" | "opportunity";
  };
  moduleScores: {
    cabal: ModuleResult;
    drain: ModuleResult;
    conviction: ModuleResult;
    narrative: ModuleResult;
    dca: ModuleResult;
  };
  updatedAt: string;
}

export interface MonitoringAlert {
  id: string;
  tokenId: string;
  chain: MonitoringChain;
  severity: "critical" | "high" | "warning" | "opportunity" | "info";
  title: string;
  message: string;
  createdAt: string;
}

export interface MonitoringSignal {
  id: string;
  tokenId: string;
  chain: MonitoringChain;
  symbol: string;
  module: "cabal" | "drain" | "conviction" | "narrative" | "dca";
  score: number;
  severity: ModuleResult["severity"];
  summary: string;
  metrics: ModuleMetric[];
  createdAt: string;
}

export interface MonitoringOverviewResponse {
  snapshots: MonitoringSnapshot[];
  alerts: MonitoringAlert[];
  generatedAt: string;
}

export interface MonitoringSignalsResponse {
  signals: MonitoringSignal[];
}

export interface MonitoringAlertsResponse {
  alerts: MonitoringAlert[];
}

export interface MonitoringWatchlistToken {
  tokenId: string;
  chain: MonitoringChain;
  tokenAddress?: string;
  symbol?: string;
  name?: string;
  mainPair?: string;
  mainPairTvl?: number;
  createdAt?: number | string;
}

export interface MonitoringWatchlistResponse {
  watchlist: MonitoringWatchlistToken[];
  userWatchlist: MonitoringWatchlistToken[];
  systemWatchlist: MonitoringWatchlistToken[];
}

export interface MonitoringTokensResponse {
  tokens: MonitoringWatchlistToken[];
}
