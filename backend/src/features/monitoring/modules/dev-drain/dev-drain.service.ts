import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import type { LiquidityTx } from "../../../../shared/clients/ave/ave-client.types";
import { clamp, toNumber } from "../../../../shared/utils/number.utils";
import { hoursAgo, toUnixSeconds } from "../../../../shared/utils/time.utils";
import { isSellTx } from "../module-utils";
import type { ModuleResult } from "../../monitoring.types";
import type { DevDrainInput, DrainWindowStats } from "./dev-drain.types";

const isRemoveEvent = (event: LiquidityTx): boolean => {
  return (event.type ?? "").toLowerCase().includes("remove");
};

const eventUsdValue = (event: LiquidityTx): number => {
  const directUsd = toNumber(event.amount_usd);
  if (directUsd > 0) {
    return directUsd;
  }

  const fromValue = toNumber(event.from_amount) * Math.max(1, toNumber(event.from_price_usd));
  const toValue = toNumber(event.to_amount) * Math.max(1, toNumber(event.to_price_usd));
  return Math.max(fromValue, toValue);
};

const dynamicThreshold = (tokenAgeHours: number, tvlUsd: number, aveRiskScore: number): number => {
  let threshold = 50;
  if (tokenAgeHours < 24) {
    threshold -= 15;
  }

  if (tvlUsd > 500_000) {
    threshold += 10;
  }

  if (aveRiskScore > 60) {
    threshold -= 10;
  }

  return Math.max(threshold, 25);
};

const computeWindowStats = (events: LiquidityTx[], cutoff: number, creatorAddress?: string): DrainWindowStats => {
  const windowEvents = events.filter((event) => toUnixSeconds(event.time ?? event.tx_time) >= cutoff);
  const removedEvents = windowEvents.filter((event) => isRemoveEvent(event));
  const totalAdded = windowEvents.filter((event) => !isRemoveEvent(event)).reduce((sum, event) => sum + eventUsdValue(event), 0);
  const totalRemoved = removedEvents.reduce((sum, event) => sum + eventUsdValue(event), 0);
  const devRemoved = removedEvents
    .filter((event) => event.sender === creatorAddress)
    .reduce((sum, event) => sum + eventUsdValue(event), 0);
  const netDrainPct = totalRemoved / Math.max(totalAdded + totalRemoved, 1);
  const devRatio = devRemoved / Math.max(totalRemoved, 1);
  const freqScore = Math.min(removedEvents.length / 10, 1);
  const score = clamp(netDrainPct * 40 + devRatio * 35 + freqScore * 25, 0, 100);

  return { netDrainPct, devRatio, removeCount: removedEvents.length, totalRemovedUsd: totalRemoved, score };
};

const toSeverity = (score: number, threshold: number): ModuleResult["severity"] => {
  if (score >= threshold + 20) {
    return "critical";
  }

  if (score >= threshold) {
    return "high";
  }

  if (score >= threshold - 10) {
    return "warning";
  }

  return "info";
};

export class DevDrainModuleService {
  public constructor(private readonly client: AveDataClient) {}

  public async evaluate(input: DevDrainInput): Promise<ModuleResult> {
    if (!input.pairId) {
      return { score: 0, severity: "info", summary: "No pair available for liquidity tracking.", metrics: [] };
    }

    const events = await this.client.getLiquidityTxs({ pairId: input.pairId, fromTime: hoursAgo(4), pageSize: 200 });
    const oneHour = computeWindowStats(events, hoursAgo(1), input.creatorAddress);
    const fourHour = computeWindowStats(events, hoursAgo(4), input.creatorAddress);
    const threshold = dynamicThreshold(input.tokenAgeHours, input.tvlUsd, input.aveRiskScore);
    const devSellBonus = await this.computeDevSellBonus(input);
    const score = clamp(Math.max(oneHour.score, fourHour.score) + devSellBonus, 0, 100);
    const severity = toSeverity(score, threshold);
    const summary = `Drain score ${score.toFixed(2)} (threshold ${threshold}). ${fourHour.removeCount} remove events in 4h.`;

    return {
      score: Number(score.toFixed(2)),
      severity,
      summary,
      metrics: [
        { label: "4h Remove Events", value: fourHour.removeCount },
        { label: "4h Net Drain", value: `${(fourHour.netDrainPct * 100).toFixed(2)}%` },
        { label: "DEV Ratio", value: `${(fourHour.devRatio * 100).toFixed(2)}%` },
        { label: "Removed USD", value: `$${Math.round(fourHour.totalRemovedUsd)}` },
      ],
    };
  }

  private async computeDevSellBonus(input: DevDrainInput): Promise<number> {
    if (!input.creatorAddress) {
      return 0;
    }

    const txs = await this.client.getAddressTx({
      walletAddress: input.creatorAddress,
      chain: input.chain,
      tokenAddress: input.tokenAddress,
      fromTime: hoursAgo(4),
      pageSize: 60,
    });
    const sellCount = txs.filter((tx) => isSellTx(tx, input.tokenAddress)).length;
    return Math.min(15, sellCount * 5);
  }
}
