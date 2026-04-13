export const SUPPORTED_CHAINS = ["solana", "bsc", "eth", "base"] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const TRENDING_CHAINS = ["solana", "bsc", "eth"] as const;

export type TrendingChain = (typeof TRENDING_CHAINS)[number];
