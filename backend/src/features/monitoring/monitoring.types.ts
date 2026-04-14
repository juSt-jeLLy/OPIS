import type { SupportedChain, TrendingChain } from "../../shared/constants/chains.constants";

export interface AnalyzeTokenInput {
  tokenId: string;
  chain: SupportedChain;
  tokenAddress?: string;
  symbol?: string;
  name?: string;
  mainPair?: string;
  mainPairTvl?: number;
  createdAt?: number | string;
}

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

export type CoreMonitoringModule = "cabal" | "drain" | "conviction" | "narrative" | "dca";
export type AdvancedMonitoringModule = "wash" | "retention" | "divergence";
export type MonitoringModule = CoreMonitoringModule | AdvancedMonitoringModule | "tos";

export interface MonitoringModuleScores {
  cabal: ModuleResult;
  drain: ModuleResult;
  conviction: ModuleResult;
  narrative: ModuleResult;
  dca: ModuleResult;
  wash: ModuleResult;
  retention: ModuleResult;
  divergence: ModuleResult;
}

export interface TosResult {
  score: number;
  zone: "safe" | "watch" | "act";
  polarity: "threat" | "opportunity";
  breakdown: {
    cabal: number;
    drain: number;
    conviction: number;
    narrative: number;
    dca: number;
  };
}

export interface MonitoringSignal {
  id: string;
  tokenId: string;
  chain: SupportedChain;
  symbol: string;
  module: MonitoringModule;
  score: number;
  severity: ModuleResult["severity"];
  summary: string;
  metrics: ModuleMetric[];
  createdAt: string;
}

export interface MonitoringAlert {
  id: string;
  tokenId: string;
  chain: SupportedChain;
  severity: "critical" | "high" | "warning" | "opportunity" | "info";
  title: string;
  message: string;
  createdAt: string;
}

export interface MonitoringSnapshot {
  tokenId: string;
  chain: SupportedChain;
  symbol: string;
  name: string;
  strategy: {
    mode: "DEFENSIVE_EXIT" | "OPPORTUNITY_ENTRY" | "DCA_ACCUMULATION" | "MONITOR";
    confidence: number;
    rationale: string;
  };
  tos: TosResult;
  moduleScores: MonitoringModuleScores;
  updatedAt: string;
}

export interface MonitoringOverview {
  snapshots: MonitoringSnapshot[];
  alerts: MonitoringAlert[];
  generatedAt: string;
}

export interface WatchlistToken {
  tokenId: string;
  chain: SupportedChain;
  tokenAddress?: string;
  symbol?: string;
  name?: string;
  mainPair?: string;
  mainPairTvl?: number;
  createdAt?: number | string;
  executionMode?: "trade" | "delegate_exit";
  assetsId?: string;
  buyAmountAtomic?: string;
  sellAmountAtomic?: string;
}

export interface NarrativeSnapshot {
  chain: TrendingChain;
  narrative: string;
  volume24h: number;
  timestamp: number;
}

export interface NarrativeAcceleration {
  chain: TrendingChain;
  narrative: string;
  acceleration: number;
}
