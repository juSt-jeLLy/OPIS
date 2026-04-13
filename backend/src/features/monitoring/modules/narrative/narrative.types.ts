import type { TrendingChain } from "../../../../shared/constants/chains.constants";

export interface NarrativeInput {
  tokenId: string;
  chain: TrendingChain;
  name: string;
  symbol: string;
}

export interface ChainNarrativeStat {
  chain: TrendingChain;
  narrative: string;
  volume24h: number;
  acceleration: number;
}
