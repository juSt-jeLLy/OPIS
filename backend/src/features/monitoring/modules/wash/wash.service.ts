import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import type { AddressTx, TopHolder } from "../../../../shared/clients/ave/ave-client.types";
import { clamp, toNumber } from "../../../../shared/utils/number.utils";
import { hoursAgo } from "../../../../shared/utils/time.utils";
import { isBuyTx, isSellTx } from "../module-utils";
import type { ModuleResult } from "../../monitoring.types";
import type { HolderFlowSample, WashEvaluationInput } from "./wash.types";

const MAX_HOLDER_SAMPLE = 4;
const MIN_ACTIVITY_EVENTS = 8;

const normalizeAddress = (value: string | undefined): string => (value ?? "").trim().toLowerCase();
const pairKey = (from: string, to: string): string => `${from}->${to}`;
const reversePairKey = (from: string, to: string): string => `${to}->${from}`;
const toBalanceRatio = (holder: TopHolder): number => toNumber(holder.balance_ratio);

const toSeverity = (score: number): ModuleResult["severity"] => {
  if (score >= 75) {
    return "critical";
  }

  if (score >= 60) {
    return "high";
  }

  if (score >= 40) {
    return "warning";
  }

  return "info";
};

const countTradeEvents = (txs: AddressTx[], tokenAddress: string): number => {
  return txs.filter((tx) => isBuyTx(tx, tokenAddress) || isSellTx(tx, tokenAddress)).length;
};

const parseInternalFlow = (txs: AddressTx[], holderSet: Set<string>): string[] => {
  return txs
    .map((tx) => {
      const from = normalizeAddress(tx.from_address ?? tx.sender);
      const to = normalizeAddress(tx.to_address);
      if (!from || !to || from === to || !holderSet.has(from) || !holderSet.has(to)) {
        return null;
      }

      return pairKey(from, to);
    })
    .filter((flow): flow is string => flow !== null);
};

const computeReciprocalLoops = (flows: string[]): number => {
  const unique = new Set(flows);
  return [...unique].filter((flow) => {
    const [from, to] = flow.split("->");
    return unique.has(reversePairKey(from, to));
  }).length / 2;
};

const collectHolderSamples = async (
  client: AveDataClient,
  input: WashEvaluationInput,
  holders: TopHolder[],
): Promise<HolderFlowSample[]> => {
  const tasks = holders.map(async (holder) => ({
    walletAddress: normalizeAddress(holder.holder),
    balanceRatio: toBalanceRatio(holder),
      txs: await client.getAddressTx({
        walletAddress: holder.holder,
        chain: input.chain,
        tokenAddress: input.tokenAddress,
        fromTime: hoursAgo(24),
        pageSize: 60,
      }),
  }));
  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((result): result is PromiseFulfilledResult<HolderFlowSample> => result.status === "fulfilled")
    .map((result) => result.value);
};

export class WashModuleService {
  public constructor(private readonly client: AveDataClient) {}

  public async evaluate(input: WashEvaluationInput): Promise<ModuleResult> {
    const holders = (await this.client.getTopHolders(input.tokenId))
      .filter((holder) => normalizeAddress(holder.holder) !== normalizeAddress(input.creatorAddress))
      .slice(0, MAX_HOLDER_SAMPLE);
    if (holders.length === 0) {
      return { score: 0, severity: "info", summary: "No holder flow data available for wash analysis.", metrics: [] };
    }

    const samples = await collectHolderSamples(this.client, input, holders);
    const holderSet = new Set(samples.map((sample) => sample.walletAddress));
    const tradeEvents = samples.reduce((sum, sample) => sum + countTradeEvents(sample.txs, input.tokenAddress), 0);
    if (tradeEvents < MIN_ACTIVITY_EVENTS) {
      return { score: 0, severity: "info", summary: "Insufficient swap activity for wash detector confidence.", metrics: [] };
    }

    const internalFlows = samples.flatMap((sample) => parseInternalFlow(sample.txs, holderSet));
    const reciprocalLoops = computeReciprocalLoops(internalFlows);
    const washRatio = internalFlows.length / Math.max(tradeEvents, 1);
    const loopRatio = reciprocalLoops / Math.max(new Set(internalFlows).size, 1);
    const concentrationRatio = clamp(samples.reduce((sum, sample) => sum + sample.balanceRatio, 0) / 100, 0, 1);
    const activityFactor = clamp(tradeEvents / 24, 0, 1);
    const score = clamp(washRatio * 120 + loopRatio * 30 + concentrationRatio * 15 + activityFactor * 10, 0, 100);

    return {
      score: Number(score.toFixed(2)),
      severity: toSeverity(score),
      summary: `Estimated wash ratio ${(washRatio * 100).toFixed(2)}% with ${reciprocalLoops} reciprocal wallet loops.`,
      metrics: [
        { label: "Holder Sample", value: samples.length },
        { label: "Internal Flows", value: internalFlows.length },
        { label: "Reciprocal Loops", value: reciprocalLoops },
        { label: "Wash Ratio", value: `${(washRatio * 100).toFixed(2)}%` },
      ],
    };
  }
}
