import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import type { AddressTx } from "../../../../shared/clients/ave/ave-client.types";
import { clamp, mean } from "../../../../shared/utils/number.utils";
import { nowInSeconds, toUnixSeconds } from "../../../../shared/utils/time.utils";
import { isBuyTx, isSellTx } from "../module-utils";
import type { ModuleResult } from "../../monitoring.types";
import type { RetentionInput, RetentionProfile } from "./retention.types";

const MAX_HOLDER_SAMPLE = 4;
const EARLY_COHORT_WINDOW_DAYS = 7;

const benchmarkRetention = (tokenAgeDays: number): number => {
  if (tokenAgeDays <= 7) {
    return 0.35;
  }

  if (tokenAgeDays <= 14) {
    return 0.25;
  }

  if (tokenAgeDays <= 30) {
    return 0.2;
  }

  return 0.15;
};

const toSeverity = (score: number): ModuleResult["severity"] => {
  if (score >= 80) {
    return "opportunity";
  }

  if (score >= 65) {
    return "high";
  }

  if (score >= 45) {
    return "warning";
  }

  return "info";
};

const toProfile = (txs: AddressTx[], tokenAddress: string): RetentionProfile | null => {
  const buys = txs.filter((tx) => isBuyTx(tx, tokenAddress));
  if (buys.length === 0) {
    return null;
  }

  const sells = txs.filter((tx) => isSellTx(tx, tokenAddress));
  const firstBuyAt = Math.min(...buys.map((tx) => toUnixSeconds(tx.time)).filter(Boolean));
  if (!firstBuyAt) {
    return null;
  }

  return {
    walletAddress: txs[0]?.wallet_address ?? "unknown",
    firstBuyAt,
    holdHours: Math.max(0, (nowInSeconds() - firstBuyAt) / 3600),
    netBuys: buys.length - sells.length,
  };
};

const collectProfiles = async (client: AveDataClient, input: RetentionInput, wallets: string[]): Promise<RetentionProfile[]> => {
  const tasks = wallets.map(async (walletAddress) =>
    toProfile(
      await client.getAddressTx({
        walletAddress,
        chain: input.chain,
        tokenAddress: input.tokenAddress,
        pageSize: 60,
      }),
      input.tokenAddress,
    ));
  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((result): result is PromiseFulfilledResult<RetentionProfile | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((profile): profile is RetentionProfile => profile !== null);
};

export class RetentionModuleService {
  public constructor(private readonly client: AveDataClient) {}

  public async evaluate(input: RetentionInput): Promise<ModuleResult> {
    if (input.tokenAgeHours < 24) {
      return { score: 0, severity: "info", summary: "Retention model needs at least 24h of token history.", metrics: [] };
    }

    const holders = (await this.client.getTopHolders(input.tokenId)).slice(0, MAX_HOLDER_SAMPLE).map((holder) => holder.holder);
    const profiles = await collectProfiles(this.client, input, holders);
    if (profiles.length === 0) {
      return { score: 0, severity: "info", summary: "No holder cohort history available yet.", metrics: [] };
    }

    const launchAt = nowInSeconds() - Math.floor(input.tokenAgeHours * 3600);
    const cohortCutoff = launchAt + Math.floor(Math.min(EARLY_COHORT_WINDOW_DAYS * 24, input.tokenAgeHours) * 3600);
    const cohort = profiles.filter((profile) => profile.firstBuyAt <= cohortCutoff);
    if (cohort.length === 0) {
      return { score: 0, severity: "info", summary: "Unable to build an early holder cohort for retention.", metrics: [] };
    }

    const retained = cohort.filter((profile) => profile.netBuys > 0);
    const retentionPct = retained.length / Math.max(cohort.length, 1);
    const benchmark = benchmarkRetention(input.tokenAgeHours / 24);
    const holdFactor = clamp(mean(retained.map((profile) => profile.holdHours)) / Math.max(input.tokenAgeHours, 24), 0, 1);
    const cohortCoverage = clamp(cohort.length / MAX_HOLDER_SAMPLE, 0, 1);
    const score = clamp((retentionPct / Math.max(benchmark, 0.01)) * 55 + holdFactor * 25 + cohortCoverage * 20, 0, 100);
    const trend = retentionPct >= benchmark ? "above" : "below";

    return {
      score: Number(score.toFixed(2)),
      severity: toSeverity(score),
      summary: `Holder retention ${(retentionPct * 100).toFixed(2)}% is ${trend} benchmark ${(benchmark * 100).toFixed(2)}%.`,
      metrics: [
        { label: "Cohort Wallets", value: cohort.length },
        { label: "Retained Wallets", value: retained.length },
        { label: "Retention", value: `${(retentionPct * 100).toFixed(2)}%` },
        { label: "Benchmark", value: `${(benchmark * 100).toFixed(2)}%` },
      ],
    };
  }
}
