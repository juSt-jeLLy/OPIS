import { MAX_HOLDERS_FOR_CABAL_SCAN, MODULE_THRESHOLDS } from "../../monitoring.constants";
import type { ModuleResult } from "../../monitoring.types";
import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import type { TopHolder } from "../../../../shared/clients/ave/ave-client.types";
import { clamp, mean } from "../../../../shared/utils/number.utils";
import { toUnixSeconds } from "../../../../shared/utils/time.utils";
import { isBuyTx } from "../module-utils";
import type { CabalEvaluationInput, HolderActivity } from "./cabal.types";

const toBalanceRatio = (holder: TopHolder): number => {
  const value = typeof holder.balance_ratio === "string" ? Number.parseFloat(holder.balance_ratio) : holder.balance_ratio;
  return Number.isFinite(value) ? Number(value) : 0;
};

const toSeverity = (score: number, clusterSupplyPct: number): ModuleResult["severity"] => {
  if (score > MODULE_THRESHOLDS.cabalHighRiskScore && clusterSupplyPct > 15) {
    return "critical";
  }

  if (score > MODULE_THRESHOLDS.cabalWatchScore && clusterSupplyPct > 8) {
    return "high";
  }

  return "info";
};

const collectHolderActivities = async (
  client: AveDataClient,
  input: CabalEvaluationInput,
  holders: TopHolder[],
): Promise<HolderActivity[]> => {
  const tasks = holders.map(async (holder) => {
    const history = await client.getAddressTx({
      walletAddress: holder.holder,
      chain: input.chain,
      tokenAddress: input.tokenAddress,
      pageSize: 40,
    });
    const buys = history.filter((tx) => isBuyTx(tx, input.tokenAddress));
    const firstTx = (buys[0] ?? history[0]) ?? null;
    if (!firstTx?.time) {
      return null;
    }

    return {
      wallet: holder.holder,
      balanceRatio: toBalanceRatio(holder),
      firstBuyTime: toUnixSeconds(firstTx.time),
      firstSender: firstTx.sender ?? "unknown",
    };
  });

  const settled = await Promise.allSettled(tasks);
  const resolved = settled
    .filter((result): result is PromiseFulfilledResult<HolderActivity | null> => result.status === "fulfilled")
    .map((result) => result.value);
  return resolved.filter((activity): activity is HolderActivity => activity !== null);
};

const computeScore = (activities: HolderActivity[]): { score: number; clusterSupplyPct: number; sharedFunders: number; clusterSize: number } => {
  const buyTimes = activities.map((item) => item.firstBuyTime);
  const medianTime = buyTimes.sort((a, b) => a - b)[Math.floor(buyTimes.length / 2)] ?? 0;
  const senderCounts = new Map<string, number>();

  activities.forEach((item) => {
    senderCounts.set(item.firstSender, (senderCounts.get(item.firstSender) ?? 0) + 1);
  });

  const coordinated = activities.filter((item) => {
    const withinLaunchWindow = Math.abs(item.firstBuyTime - medianTime) <= 600;
    const sharedFunder = (senderCounts.get(item.firstSender) ?? 0) > 1;
    return withinLaunchWindow || sharedFunder || item.balanceRatio >= 1;
  });

  const clusterSupplyPct = coordinated.reduce((sum, item) => sum + item.balanceRatio, 0);
  const avgDeltaSeconds = mean(coordinated.map((item) => Math.abs(item.firstBuyTime - medianTime)));
  const sharedFunders = [...senderCounts.values()].filter((count) => count > 1).length;
  const clusterSizeRatio = coordinated.length / Math.max(1, activities.length);
  const supplyRatio = clamp(clusterSupplyPct / 100, 0, 1);
  const timingBonus = avgDeltaSeconds > 0 && avgDeltaSeconds < 600 ? 20 : 0;
  const funderBonus = sharedFunders > 0 ? 10 : 0;
  const score = clamp(clusterSizeRatio * 40 + supplyRatio * 30 + timingBonus + funderBonus, 0, 100);

  return { score, clusterSupplyPct, sharedFunders, clusterSize: coordinated.length };
};

export class CabalModuleService {
  public constructor(private readonly client: AveDataClient) {}

  public async evaluate(input: CabalEvaluationInput): Promise<ModuleResult> {
    const allHolders = await this.client.getTopHolders(input.tokenId);
    const holders = allHolders
      .filter((holder) => holder.holder !== input.creatorAddress)
      .slice(0, MAX_HOLDERS_FOR_CABAL_SCAN);

    if (holders.length === 0) {
      return { score: 0, severity: "info", summary: "No holder data available.", metrics: [] };
    }

    const activities = await collectHolderActivities(this.client, input, holders);
    if (activities.length === 0) {
      return { score: 0, severity: "info", summary: "No holder activity matched the token history.", metrics: [] };
    }

    const { score, clusterSupplyPct, sharedFunders, clusterSize } = computeScore(activities);
    const severity = toSeverity(score, clusterSupplyPct);
    const summary = `Cluster of ${clusterSize} wallets controls ${clusterSupplyPct.toFixed(2)}% with ${sharedFunders} shared funders.`;

    return {
      score: Number(score.toFixed(2)),
      severity,
      summary,
      metrics: [
        { label: "Cluster Size", value: `${clusterSize}/${activities.length}` },
        { label: "Cluster Supply", value: `${clusterSupplyPct.toFixed(2)}%` },
        { label: "Shared Funders", value: sharedFunders },
      ],
    };
  }
}
