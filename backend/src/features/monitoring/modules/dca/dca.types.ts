import type { SupportedChain } from "../../../../shared/constants/chains.constants";

export interface DcaInput {
  tokenId: string;
  tokenAddress: string;
  chain: SupportedChain;
}

export interface WalletDcaProfile {
  walletAddress: string;
  score: number;
  buyCount: number;
  averageIntervalMinutes: number;
  dipBuysRatio: number;
}
