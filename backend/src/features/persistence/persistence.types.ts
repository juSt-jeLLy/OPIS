import type { SupportedChain } from "../../shared/constants/chains.constants";

export type ExecutionMode = "trade" | "delegate_exit";

export interface PersistedWatchlistRow {
  user_id: string;
  token_id: string;
  chain: SupportedChain;
  token_address?: string;
  symbol?: string;
  name?: string;
  main_pair?: string;
  main_pair_tvl?: number;
  execution_mode: ExecutionMode;
  assets_id?: string;
  buy_amount_atomic?: string;
  sell_amount_atomic?: string;
}

export interface PersistedTradeActionRow {
  id?: string;
  user_id: string;
  token_id: string;
  chain: SupportedChain;
  symbol: string;
  action_type: "buy" | "exit";
  status: "pending" | "executed" | "dismissed" | "failed";
  reason: string;
  signal_id?: string;
  execution_mode: ExecutionMode;
  in_token_address: string;
  out_token_address: string;
  in_amount: string;
  assets_id?: string;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface PersistedTradeRow {
  id?: string;
  user_id: string;
  action_id?: string;
  token_id: string;
  chain: SupportedChain;
  symbol: string;
  order_id: string;
  status: string;
  swap_type: "buy" | "sell";
  in_token_address: string;
  out_token_address: string;
  in_amount: string;
  out_amount?: string;
  tx_hash?: string;
  tx_price_usd?: string;
  error_message?: string;
  quote_payload?: Record<string, unknown>;
  request_payload?: Record<string, unknown>;
  status_payload?: Record<string, unknown>;
}

