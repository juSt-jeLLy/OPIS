import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import { TRENDING_CHAINS, type TrendingChain } from "../../../../shared/constants/chains.constants";
import { clamp, toNumber } from "../../../../shared/utils/number.utils";
import { nowInSeconds } from "../../../../shared/utils/time.utils";
import type { MonitoringRepository } from "../../monitoring.repository";
import type { ModuleResult, NarrativeSnapshot } from "../../monitoring.types";
import { NARRATIVE_KEYWORDS } from "./narrative-keywords";
import type { ChainNarrativeStat, NarrativeInput } from "./narrative.types";

const classifyNarrative = (name: string, symbol: string): string => {
  const text = `${name} ${symbol}`.toLowerCase();
  const match = Object.entries(NARRATIVE_KEYWORDS).find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)));
  return match?.[0] ?? "other";
};

const buildStatKey = (chain: TrendingChain, narrative: string): string => `${chain}:${narrative}`;

const toSeverity = (score: number): ModuleResult["severity"] => {
  if (score >= 70) {
    return "opportunity";
  }

  if (score >= 45) {
    return "high";
  }

  if (score >= 25) {
    return "warning";
  }

  return "info";
};

export class NarrativeModuleService {
  public constructor(
    private readonly client: AveDataClient,
    private readonly repository: MonitoringRepository,
  ) {}

  public async evaluate(input: NarrativeInput): Promise<ModuleResult> {
    const stats = await this.collectStats();
    const tokenNarrative = classifyNarrative(input.name, input.symbol);
    if (tokenNarrative === "other") {
      return { score: 0, severity: "info", summary: "Token narrative is not mapped yet.", metrics: [{ label: "Narrative", value: "other" }] };
    }

    const relevant = stats.filter((item) => item.narrative === tokenNarrative);
    const targetAcceleration = relevant.find((item) => item.chain === input.chain)?.acceleration ?? 0;
    const sourceAcceleration = Math.max(0, ...relevant.filter((item) => item.chain !== input.chain).map((item) => item.acceleration));
    const rotationScore = sourceAcceleration > 0.3 && targetAcceleration < 0.1 ? 70 + clamp(sourceAcceleration * 30, 0, 20) : 0;
    const localMomentumScore = clamp(targetAcceleration * 100, 0, 100);
    const score = Math.max(rotationScore, localMomentumScore);

    return {
      score: Number(score.toFixed(2)),
      severity: toSeverity(score),
      summary: `Narrative ${tokenNarrative} source acceleration ${(sourceAcceleration * 100).toFixed(2)}%, target ${(targetAcceleration * 100).toFixed(2)}%.`,
      metrics: [
        { label: "Narrative", value: tokenNarrative },
        { label: "Target Acceleration", value: `${(targetAcceleration * 100).toFixed(2)}%` },
        { label: "Source Acceleration", value: `${(sourceAcceleration * 100).toFixed(2)}%` },
      ],
    };
  }

  private async collectStats(): Promise<ChainNarrativeStat[]> {
    const timestamp = nowInSeconds();
    const tokenSets = await Promise.all(TRENDING_CHAINS.map((chain) => this.client.listTrending({ chain, pageSize: 100 })));
    const nextSnapshots: NarrativeSnapshot[] = [];
    const volumeBuckets = new Map<string, number>();

    tokenSets.forEach((tokens, index) => {
      const chain = TRENDING_CHAINS[index];
      tokens.forEach((token) => {
        const narrative = classifyNarrative(token.name, token.symbol);
        const key = buildStatKey(chain, narrative);
        const volume24h = toNumber(token.token_tx_volume_usd_24h ?? token.tx_volume_u_24h);
        volumeBuckets.set(key, (volumeBuckets.get(key) ?? 0) + volume24h);
      });
    });

    const stats = [...volumeBuckets.entries()].map(([key, volume24h]) => {
      const [chain, narrative] = key.split(":") as [TrendingChain, string];
      const previous = this.repository.getPreviousNarrativeSnapshot(chain, narrative);
      const acceleration = previous ? (volume24h - previous.volume24h) / Math.max(previous.volume24h, 1) : 0;
      nextSnapshots.push({ chain, narrative, volume24h, timestamp });
      return { chain, narrative, volume24h, acceleration };
    });

    this.repository.saveNarrativeSnapshots(nextSnapshots);
    return stats;
  }
}
