import type { SupportedChain } from "../../../../shared/constants/chains.constants";

export interface CabalEvaluationInput {
  tokenId: string;
  tokenAddress: string;
  chain: SupportedChain;
  creatorAddress?: string;
}

export interface HolderActivity {
  wallet: string;
  balanceRatio: number;
  firstBuyTime: number;
  firstSender: string;
}
