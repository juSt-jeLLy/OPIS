import type { SupportedChain } from "../../shared/constants/chains.constants";
import type { ExecutionMode } from "../persistence/persistence.types";
import type { WatchlistToken } from "../monitoring/monitoring.types";

export type TradeActionType = "buy" | "exit";
export type TradeActionStatus = "pending" | "executed" | "dismissed" | "failed";

export interface TradeAction {
  id: string;
  userId: string;
  tokenId: string;
  chain: SupportedChain;
  symbol: string;
  actionType: TradeActionType;
  status: TradeActionStatus;
  reason: string;
  executionMode: ExecutionMode;
  inTokenAddress: string;
  outTokenAddress: string;
  inAmount: string;
  assetsId?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface TradeExecution {
  id: string;
  userId: string;
  actionId?: string;
  tokenId: string;
  chain: SupportedChain;
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
  updatedAt: string;
}

export interface CreateActionInput {
  userId: string;
  tokenId: string;
  chain: SupportedChain;
  symbol: string;
  actionType: TradeActionType;
  reason: string;
  executionMode: ExecutionMode;
  inTokenAddress: string;
  outTokenAddress: string;
  inAmount: string;
  assetsId?: string;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface ExecuteTradeInput {
  actionId?: string;
  userId: string;
  tokenId: string;
  chain: SupportedChain;
  symbol: string;
  assetsId: string;
  inTokenAddress: string;
  outTokenAddress: string;
  inAmount: string;
  swapType: "buy" | "sell";
  slippageBps: string;
  useMev: boolean;
  autoGas?: "low" | "average" | "high";
  autoSlippage?: boolean;
}

export interface ExecuteSignalInput {
  userId: string;
  tokenId: string;
  chain: SupportedChain;
  symbol: string;
  actionType: TradeActionType;
  inAmount?: string;
  assetsId?: string;
  executionMode?: ExecutionMode;
  watchToken?: WatchlistToken;
}
