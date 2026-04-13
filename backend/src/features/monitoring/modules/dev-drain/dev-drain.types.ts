import type { SupportedChain } from "../../../../shared/constants/chains.constants";

export interface DevDrainInput {
  tokenId: string;
  tokenAddress: string;
  chain: SupportedChain;
  pairId?: string;
  tokenAgeHours: number;
  tvlUsd: number;
  creatorAddress?: string;
  aveRiskScore: number;
}

export interface DrainWindowStats {
  netDrainPct: number;
  devRatio: number;
  removeCount: number;
  totalRemovedUsd: number;
  score: number;
}
