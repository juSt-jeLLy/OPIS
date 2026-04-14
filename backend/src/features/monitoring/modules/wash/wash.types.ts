import type { SupportedChain } from "../../../../shared/constants/chains.constants";
import type { AddressTx } from "../../../../shared/clients/ave/ave-client.types";

export interface WashEvaluationInput {
  tokenId: string;
  tokenAddress: string;
  chain: SupportedChain;
  creatorAddress?: string;
}

export interface HolderFlowSample {
  walletAddress: string;
  balanceRatio: number;
  txs: AddressTx[];
}
