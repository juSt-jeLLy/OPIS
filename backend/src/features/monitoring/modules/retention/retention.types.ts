import type { SupportedChain } from "../../../../shared/constants/chains.constants";

export interface RetentionInput {
  tokenId: string;
  tokenAddress: string;
  chain: SupportedChain;
  tokenAgeHours: number;
}

export interface RetentionProfile {
  walletAddress: string;
  firstBuyAt: number;
  holdHours: number;
  netBuys: number;
}
