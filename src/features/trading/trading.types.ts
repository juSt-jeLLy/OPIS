import type { MonitoringChain } from "../monitoring/monitoring.types";

export interface TradeAction {
  id: string;
  userId: string;
  tokenId: string;
  chain: MonitoringChain;
  symbol: string;
  actionType: "buy" | "exit";
  status: "pending" | "executed" | "dismissed" | "failed";
  reason: string;
  executionMode: "trade" | "delegate_exit";
  inTokenAddress: string;
  outTokenAddress: string;
  inAmount: string;
  assetsId?: string;
  priority: number;
  createdAt: string;
}

export interface TradeExecution {
  id: string;
  userId: string;
  actionId?: string;
  tokenId: string;
  chain: MonitoringChain;
  symbol: string;
  orderId: string;
  status: string;
  swapType: "buy" | "sell";
  inTokenAddress: string;
  outTokenAddress: string;
  inAmount: string;
  outAmount?: string;
  txHash?: string;
  txPriceUsd?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface TradingActionsResponse {
  actions: TradeAction[];
}

export interface TradingTradesResponse {
  trades: TradeExecution[];
}

export interface SignalExecuteRequest {
  tokenId: string;
  chain: MonitoringChain;
  symbol: string;
  actionType: "buy" | "exit";
  inAmount?: string;
  assetsId?: string;
  executionMode?: "trade" | "delegate_exit";
}
