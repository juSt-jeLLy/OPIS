import type { SupportedChain, TrendingChain } from "../../constants/chains.constants";

export interface ApiEnvelope<T> {
  status?: number;
  msg?: string;
  data?: T;
  data_type?: number;
}

export interface TokenSummary {
  token: string;
  chain: SupportedChain;
  name: string;
  symbol: string;
  current_price_usd?: string;
  market_cap?: string;
  holders?: number;
  main_pair?: string;
  main_pair_tvl?: number | string;
  created_at?: number | string;
  updated_at?: number;
  tx_volume_u_24h?: number | string;
  token_tx_volume_usd_24h?: number | string;
}

export interface TopHolder {
  holder: string;
  balance_ratio?: number | string;
  amount_cur?: number | string;
  main_coin_balance?: number | string;
}

export interface ContractInfo {
  id: string;
  token: string;
  chain: SupportedChain;
  creator_address?: string;
  analysis_risk_score?: number | string;
  lock_amount?: number | string;
  token_lock_percent?: number | string;
}

export interface AddressTx {
  hash?: string;
  time?: number | string;
  sender?: string;
  from_amount?: number | string;
  from_price_usd?: number | string;
  tx_swap_type?: number | string;
  wallet_address?: string;
  type?: string;
  from_address?: string;
  to_address?: string;
}

export interface LiquidityTx {
  hash?: string;
  time?: number | string;
  tx_time?: number | string;
  type?: string;
  sender?: string;
  from_amount?: number | string;
  from_price_usd?: number | string;
  to_amount?: number | string;
  to_price_usd?: number | string;
  amount_usd?: number | string;
}

export interface SmartWalletInfo {
  wallet_address: string;
  total_profit?: number;
  total_profit_rate?: number;
  total_volume?: number;
}

export interface AddressPnl {
  wallet_address?: string;
  main_coin_balance_usd?: number | string;
  realized_profit?: number | string;
  unrealized_profit?: number | string;
}

export interface KlinePoint {
  time?: number;
  high?: number | string;
  low?: number | string;
  close?: number | string;
}

export interface TrendingQuery {
  chain: TrendingChain;
  pageSize?: number;
}

export interface AddressTxQuery {
  walletAddress: string;
  chain: SupportedChain;
  tokenAddress: string;
  pageSize?: number;
  fromTime?: number;
}

export interface AddressPnlQuery {
  walletAddress: string;
  chain: SupportedChain;
  tokenAddress: string;
}

export interface LiquidityTxQuery {
  pairId: string;
  pageSize?: number;
  fromTime?: number;
}

export interface SmartWalletQuery {
  chain: SupportedChain;
  pageSize?: number;
}
