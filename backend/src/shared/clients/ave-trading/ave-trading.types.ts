import type { SupportedChain } from "../../constants/chains.constants";

export interface AveTradingEnvelope<T> {
  status?: number;
  msg?: string;
  data?: T;
}

export interface QuoteRequest {
  chain: SupportedChain;
  inAmount: string;
  inTokenAddress: string;
  outTokenAddress: string;
  swapType: "buy" | "sell";
}

export interface QuoteResponse {
  estimateOut: string;
  decimals: number;
  spender?: string | string[];
}

export interface AutoGasTier {
  chain: SupportedChain;
  mev: boolean;
  high: string;
  average: string;
  low: string;
  gasLimit?: string;
}

export interface SendSwapOrderRequest {
  chain: SupportedChain;
  assetsId: string;
  inTokenAddress: string;
  outTokenAddress: string;
  inAmount: string;
  swapType: "buy" | "sell";
  slippage: string;
  useMev: boolean;
  gas?: string;
  extraGas?: string;
  autoSlippage?: boolean;
  autoGas?: "low" | "average" | "high";
}

export interface SendSwapOrderResponse {
  id: string;
}

export interface SwapOrderStatus {
  id: string;
  status: "generated" | "waiting" | "sent" | "confirmed" | "error" | "auto_cancelled" | "cancelled";
  chain: SupportedChain;
  swapType: "buy" | "sell" | "stoploss" | "takeprofit" | "trailing";
  txPriceUsd?: string;
  txHash?: string;
  inAmount?: string;
  outAmount?: string;
  errorMessage?: string;
}

export interface DelegateUserInfo {
  assetsId: string;
  status?: "enabled" | "disabled";
  type?: "self" | "delegate";
  assetsName?: string;
}
