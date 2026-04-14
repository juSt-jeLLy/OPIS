import type { SupportedChain } from "../../shared/constants/chains.constants";

export const THREAT_EXIT_TRIGGER = 65;
export const OPPORTUNITY_BUY_TRIGGER = 60;
export const ACTION_DEDUPE_WINDOW_MS = 120_000;
export const ORDER_STATUS_POLL_MS = 2_000;
export const ORDER_STATUS_MAX_POLLS = 4;

export const DEFAULT_SLIPPAGE_BPS = "500";
export const DEFAULT_AUTO_GAS = "average";
export const DEFAULT_USE_MEV = true;

export const NATIVE_TOKEN_BY_CHAIN: Record<SupportedChain, string> = {
  solana: "sol",
  bsc: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  eth: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  base: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
};

export const DEFAULT_BUY_AMOUNT_BY_CHAIN: Record<SupportedChain, string> = {
  solana: "100000000",
  bsc: "10000000000000000",
  eth: "5000000000000000",
  base: "5000000000000000",
};

