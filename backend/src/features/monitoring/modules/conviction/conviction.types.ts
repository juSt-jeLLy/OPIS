import type { SupportedChain } from "../../../../shared/constants/chains.constants";

export interface ConvictionInput {
  tokenId: string;
  tokenAddress: string;
  chain: SupportedChain;
}

export interface WalletConviction {
  walletAddress: string;
  score: number;
  buyCount: number;
  holdHours: number;
}
