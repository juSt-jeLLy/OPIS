import type { SupportedChain } from "../../../../shared/constants/chains.constants";

export interface DivergenceInput {
  tokenId: string;
  tokenAddress: string;
  chain: SupportedChain;
  pairId?: string;
}
