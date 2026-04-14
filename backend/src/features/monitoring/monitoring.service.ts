import { MAX_SIGNALS_RETURNED } from "./monitoring.constants";
import { buildAlertsFromSnapshot, buildSignalsFromSnapshot } from "./monitoring.mapper";
import type {
  AnalyzeTokenInput,
  ModuleResult,
  MonitoringModuleScores,
  MonitoringAlert,
  MonitoringOverview,
  MonitoringSignal,
  MonitoringSnapshot,
  WatchlistToken,
} from "./monitoring.types";
import type { MonitoringRepository } from "./monitoring.repository";
import type { CabalModuleService } from "./modules/cabal/cabal.service";
import type { ConvictionModuleService } from "./modules/conviction/conviction.service";
import type { DcaModuleService } from "./modules/dca/dca.service";
import type { DevDrainModuleService } from "./modules/dev-drain/dev-drain.service";
import type { NarrativeModuleService } from "./modules/narrative/narrative.service";
import type { WashModuleService } from "./modules/wash/wash.service";
import type { RetentionModuleService } from "./modules/retention/retention.service";
import type { DivergenceModuleService } from "./modules/divergence/divergence.service";
import type { TosService } from "./tos/tos.service";
import type { AveDataClient } from "../../shared/clients/ave/ave-client";
import type { ContractInfo, TokenSummary } from "../../shared/clients/ave/ave-client.types";
import { TRENDING_CHAINS, type SupportedChain } from "../../shared/constants/chains.constants";
import type { Logger } from "../../shared/logger/logger";
import { toNumber } from "../../shared/utils/number.utils";
import type { MonitoringPersistenceRepository } from "../persistence/monitoring-persistence.repository";

const hasNarrativeChainSupport = (chain: SupportedChain): chain is "solana" | "bsc" | "eth" => {
  return TRENDING_CHAINS.includes(chain as "solana" | "bsc" | "eth");
};

const toTimestampMs = (value: number | string): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1_000;
  }

  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) {
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1_000;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toWatchlistToken = (token: TokenSummary): WatchlistToken | null => {
  if (!token.token || !token.chain) {
    return null;
  }

  return {
    tokenId: `${token.token}-${token.chain}`,
    chain: token.chain,
    tokenAddress: token.token,
    symbol: token.symbol,
    name: token.name,
    mainPair: token.main_pair,
    mainPairTvl: toNumber(token.main_pair_tvl),
    createdAt: token.created_at,
  };
};

const dedupeWatchlistTokens = (tokens: WatchlistToken[]): WatchlistToken[] => {
  const deduped = new Map<string, WatchlistToken>();
  tokens.forEach((token) => {
    deduped.set(`${token.chain}:${token.tokenId}`, token);
  });
  return [...deduped.values()];
};

const tokenAgeHours = (createdAt: number | string | undefined): number => {
  if (createdAt === undefined) {
    return 999;
  }

  const createdTime = toTimestampMs(createdAt);
  if (!createdTime) {
    return 999;
  }

  return Math.max(0, (Date.now() - createdTime) / 3_600_000);
};

const fallbackNarrativeModule: ModuleResult = {
  score: 0,
  severity: "info",
  summary: "Narrative module currently tracks Solana/BSC/ETH.",
  metrics: [],
};

const signalSeverityRank: Record<ModuleResult["severity"], number> = {
  critical: 5,
  high: 4,
  warning: 3,
  opportunity: 2,
  info: 1,
};

const fallbackContract = (tokenId: string, chain: SupportedChain): ContractInfo => ({
  id: tokenId,
  token: tokenId,
  chain,
});

const tokenAddressFromTokenId = (tokenId: string): string => {
  const segments = tokenId.split("-");
  return segments.length > 1 ? segments.slice(0, -1).join("-") : tokenId;
};

const safeModuleResult = (summary: string): ModuleResult => ({ score: 0, severity: "info", summary, metrics: [] });
type ModuleName = keyof MonitoringModuleScores;
type RealtimeTrigger = "wss_liq" | "wss_tx" | "wss_multi_tx";
const MODULE_TTLS_MS = {
  cabal: 60 * 60_000,
  drain: 60_000,
  conviction: 2 * 60 * 60_000,
  narrative: 5 * 60_000,
  dca: 2 * 60 * 60_000,
  wash: 5 * 60_000,
  retention: 12 * 60 * 60_000,
  divergence: 3 * 60_000,
} as const;

const deriveStrategy = (
  modules: MonitoringModuleScores,
  tosScore: number,
): MonitoringSnapshot["strategy"] => {
  const defensiveScore = Math.max(modules.cabal.score, modules.drain.score, modules.wash.score, modules.divergence.score);
  if (defensiveScore >= 70) {
    return { mode: "DEFENSIVE_EXIT", confidence: Number(defensiveScore.toFixed(2)), rationale: "Manipulation, wash flow, or liquidity-stress risk is elevated." };
  }

  if (modules.dca.score >= 65 && modules.conviction.score >= 60) {
    const confidence = Number(((modules.dca.score + modules.conviction.score) / 2).toFixed(2));
    return { mode: "DCA_ACCUMULATION", confidence, rationale: "Smart wallets are accumulating with repeat buy cadence." };
  }

  if (tosScore >= 60 && modules.conviction.score >= 55 && modules.retention.score >= 55) {
    const confidence = Number(Math.max(modules.conviction.score, modules.narrative.score, modules.retention.score).toFixed(2));
    return { mode: "OPPORTUNITY_ENTRY", confidence, rationale: "Conviction, narrative, and holder retention are aligned for opportunity setup." };
  }

  return { mode: "MONITOR", confidence: Number(tosScore.toFixed(2)), rationale: "Signal quality is mixed; keep monitoring for confirmation." };
};

const invalidateModulesForTrigger = (trigger: RealtimeTrigger): ModuleName[] => {
  if (trigger === "wss_liq") {
    return ["drain", "divergence"];
  }

  if (trigger === "wss_multi_tx") {
    return ["drain", "dca", "conviction", "divergence"];
  }

  return ["drain", "divergence"];
};

type OverviewListener = (overview: MonitoringOverview) => void;
type SnapshotListener = (snapshot: MonitoringSnapshot, watchlistsByUser: Record<string, WatchlistToken[]>) => Promise<void> | void;
const OVERVIEW_BROADCAST_DEBOUNCE_MS = 500;

export class MonitoringService {
  private readonly moduleResultCache = new Map<string, { result: ModuleResult; expiresAt: number }>();
  private readonly overviewListeners = new Set<OverviewListener>();
  private readonly snapshotListeners = new Set<SnapshotListener>();
  private overviewBroadcastTimer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly client: AveDataClient,
    private readonly repository: MonitoringRepository,
    private readonly cabalModule: CabalModuleService,
    private readonly drainModule: DevDrainModuleService,
    private readonly convictionModule: ConvictionModuleService,
    private readonly dcaModule: DcaModuleService,
    private readonly narrativeModule: NarrativeModuleService,
    private readonly washModule: WashModuleService,
    private readonly retentionModule: RetentionModuleService,
    private readonly divergenceModule: DivergenceModuleService,
    private readonly tosService: TosService,
    private readonly logger: Logger,
    private readonly monitoringPersistence?: MonitoringPersistenceRepository,
  ) {}

  public async analyzeToken(input: AnalyzeTokenInput): Promise<MonitoringSnapshot> {
    const [token, contract] = await Promise.all([
      this.client.getTokenDetails(input.tokenId).catch(() => null),
      this.client.getContracts(input.tokenId).catch(() => fallbackContract(input.tokenId, input.chain)),
    ]);
    const tokenAddressValue = token?.token ?? input.tokenAddress ?? tokenAddressFromTokenId(input.tokenId);
    const tokenAddress = typeof tokenAddressValue === "string" && tokenAddressValue.length > 0 ? tokenAddressValue : tokenAddressFromTokenId(input.tokenId);
    const symbolValue = token?.symbol ?? input.symbol;
    const symbol = typeof symbolValue === "string" && symbolValue.length > 0 ? symbolValue : tokenAddress.slice(0, 6);
    const nameValue = token?.name ?? input.name;
    const name = typeof nameValue === "string" && nameValue.length > 0 ? nameValue : symbol;
    const pairValue = token?.main_pair ?? input.mainPair;
    const pairRaw = typeof pairValue === "string" && pairValue.length > 0 ? pairValue : undefined;

    const moduleScores = await this.evaluateModules(input, {
      creatorAddress: contract.creator_address,
      pairId: pairRaw ? (pairRaw.includes("-") ? pairRaw : `${pairRaw}-${input.chain}`) : undefined,
      tokenAddress,
      tokenAge: tokenAgeHours(token?.created_at ?? input.createdAt),
      tvlUsd: toNumber(token?.main_pair_tvl ?? input.mainPairTvl),
      riskScore: toNumber(contract.analysis_risk_score),
      name,
      symbol,
    });
    const tos = this.tosService.compose(moduleScores);

    const snapshot: MonitoringSnapshot = {
      tokenId: input.tokenId,
      chain: input.chain,
      symbol,
      name,
      tos,
      strategy: deriveStrategy(moduleScores, tos.score),
      moduleScores,
      updatedAt: new Date().toISOString(),
    };

    const signals = buildSignalsFromSnapshot(snapshot);
    const alerts = buildAlertsFromSnapshot(snapshot);
    this.repository.upsertSnapshot(snapshot);
    this.repository.addSignals(signals);
    this.repository.addAlerts(alerts);
    void this.monitoringPersistence?.saveSignals(signals);
    void this.monitoringPersistence?.saveAlerts(alerts);
    if (this.snapshotListeners.size > 0) {
      const watchlistsByUser = this.repository.getUserWatchlists();
      this.snapshotListeners.forEach((listener) => {
        void Promise.resolve(listener(snapshot, watchlistsByUser)).catch((error) => {
          this.logger.error("Snapshot listener failed", { tokenId: snapshot.tokenId, error: String(error) });
        });
      });
    }
    this.scheduleOverviewBroadcast();
    return snapshot;
  }

  public async analyzeTokenFromRealtime(input: AnalyzeTokenInput, trigger: RealtimeTrigger): Promise<MonitoringSnapshot> {
    this.invalidateModuleCache(input.tokenId, invalidateModulesForTrigger(trigger));
    return this.analyzeToken(input);
  }

  public getOverview(limit = 30): MonitoringOverview {
    const snapshots = this.repository
      .listSnapshots()
      .sort((left, right) => right.tos.score - left.tos.score)
      .slice(0, limit);
    return { snapshots, alerts: this.repository.listAlerts(limit), generatedAt: new Date().toISOString() };
  }

  public getSignals(limit = MAX_SIGNALS_RETURNED, userId?: string): MonitoringSignal[] {
    const dedupedByTokenModule = new Map<string, MonitoringSignal>();
    this.repository.listSignals(500).forEach((signal) => {
      const key = `${signal.tokenId}:${signal.module}`;
      if (!dedupedByTokenModule.has(key)) {
        dedupedByTokenModule.set(key, signal);
      }
    });

    this.repository.listSnapshots().forEach((snapshot) => {
      buildSignalsFromSnapshot(snapshot).forEach((signal) => {
        const key = `${signal.tokenId}:${signal.module}`;
        if (!dedupedByTokenModule.has(key)) {
          dedupedByTokenModule.set(key, signal);
        }
      });
    });

    const userTokenIds = new Set((userId ? this.repository.getUserWatchlist(userId) : []).map((token) => token.tokenId));
    const ordered = [...dedupedByTokenModule.values()].sort((left, right) => {
      const leftUser = userTokenIds.has(left.tokenId) ? 1 : 0;
      const rightUser = userTokenIds.has(right.tokenId) ? 1 : 0;
      if (leftUser !== rightUser) {
        return rightUser - leftUser;
      }

      const severityDiff = signalSeverityRank[right.severity] - signalSeverityRank[left.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      const createdDiff = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      if (createdDiff !== 0) {
        return createdDiff;
      }

      return right.score - left.score;
    });

    const userSignals = ordered.filter((signal) => userTokenIds.has(signal.tokenId));
    const systemSignals = ordered
      .filter((signal) => !userTokenIds.has(signal.tokenId))
      .slice(0, Math.max(limit - userSignals.length, 0));

    return [...userSignals, ...systemSignals].slice(0, Math.max(limit, userSignals.length));
  }

  public getAlerts(limit = 30): MonitoringAlert[] {
    return this.repository.listAlerts(limit);
  }

  public replaceUserWatchlist(userId: string, tokens: WatchlistToken[]): void {
    this.repository.replaceUserWatchlist(userId, tokens);
    this.pruneDataOutsideWatchlist();
    this.scheduleOverviewBroadcast();
  }

  public setSystemWatchlist(tokens: WatchlistToken[]): void {
    this.repository.setSystemWatchlist(tokens);
    this.pruneDataOutsideWatchlist();
    this.scheduleOverviewBroadcast();
  }

  public getUserWatchlist(userId: string): WatchlistToken[] {
    return this.repository.getUserWatchlist(userId);
  }

  public getUserWatchlists(): Record<string, WatchlistToken[]> {
    return this.repository.getUserWatchlists();
  }

  public getSystemWatchlist(): WatchlistToken[] {
    return this.repository.getSystemWatchlist();
  }

  public getWatchlists(userId: string): {
    watchlist: WatchlistToken[];
    userWatchlist: WatchlistToken[];
    systemWatchlist: WatchlistToken[];
  } {
    return {
      watchlist: this.repository.getWatchlist(userId),
      userWatchlist: this.repository.getUserWatchlist(userId),
      systemWatchlist: this.repository.getSystemWatchlist(),
    };
  }

  public getWatchlist(userId?: string): WatchlistToken[] {
    return this.repository.getWatchlist(userId);
  }

  public async searchTokens(query: string, chain?: SupportedChain, limit = 40): Promise<WatchlistToken[]> {
    const normalizedQuery = query.trim();
    const source =
      normalizedQuery.length > 0
        ? await this.client.searchTokens(normalizedQuery)
        : chain && TRENDING_CHAINS.includes(chain as "solana" | "bsc" | "eth")
          ? await this.client.listTrending({ chain: chain as "solana" | "bsc" | "eth", pageSize: Math.max(limit * 2, 40) })
          : (await Promise.all(TRENDING_CHAINS.map((candidate) => this.client.listTrending({ chain: candidate, pageSize: Math.max(limit, 40) })))).flat();

    const mapped = source
      .map(toWatchlistToken)
      .filter((token): token is WatchlistToken => token !== null)
      .filter((token) => (chain ? token.chain === chain : true))
      .sort((left, right) => (right.mainPairTvl ?? 0) - (left.mainPairTvl ?? 0));

    return dedupeWatchlistTokens(mapped).slice(0, limit);
  }

  public clearModuleCache(): void {
    this.moduleResultCache.clear();
  }

  public async runWatchlistCycle(): Promise<MonitoringSnapshot[]> {
    const watchlist = this.repository.getWatchlist();
    this.pruneDataOutsideWatchlist();
    const snapshots: MonitoringSnapshot[] = [];
    const batchSize = 1;
    for (let index = 0; index < watchlist.length; index += batchSize) {
      const batch = watchlist.slice(index, index + batchSize);
      const results = await Promise.allSettled(batch.map((token) => this.analyzeToken(token)));
      results.forEach((result, resultIndex) => {
        if (result.status === "fulfilled") {
          snapshots.push(result.value);
          return;
        }

        const token = batch[resultIndex];
        this.logger.warn("Failed monitoring scan", { tokenId: token.tokenId, chain: token.chain, error: String(result.reason) });
      });
    }
    return snapshots;
  }

  public subscribeOverview(listener: OverviewListener): () => void {
    this.overviewListeners.add(listener);
    return () => {
      this.overviewListeners.delete(listener);
    };
  }

  public subscribeSnapshots(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  private async evaluateModules(
    input: AnalyzeTokenInput,
    context: { creatorAddress?: string; pairId?: string; tokenAddress: string; tokenAge: number; tvlUsd: number; riskScore: number; name: string; symbol: string },
  ): Promise<MonitoringModuleScores> {
    const cabal = await this.evaluateModuleWithCache(
      `${input.tokenId}:cabal`,
      MODULE_TTLS_MS.cabal,
      () => this.cabalModule.evaluate({ tokenId: input.tokenId, tokenAddress: context.tokenAddress, chain: input.chain, creatorAddress: context.creatorAddress }),
      "Cabal module could not process this token in the current cycle.",
    );
    const drain = await this.evaluateModuleWithCache(
      `${input.tokenId}:drain`,
      MODULE_TTLS_MS.drain,
      () => this.drainModule.evaluate({ tokenId: input.tokenId, tokenAddress: context.tokenAddress, chain: input.chain, pairId: context.pairId, tokenAgeHours: context.tokenAge, tvlUsd: context.tvlUsd, creatorAddress: context.creatorAddress, aveRiskScore: context.riskScore }),
      "Drain module could not process this token in the current cycle.",
    );
    const conviction = await this.evaluateModuleWithCache(
      `${input.tokenId}:conviction`,
      MODULE_TTLS_MS.conviction,
      () => this.convictionModule.evaluate({ tokenId: input.tokenId, tokenAddress: context.tokenAddress, chain: input.chain }),
      "Conviction module could not process this token in the current cycle.",
    );
    const narrative = hasNarrativeChainSupport(input.chain)
      ? await this.evaluateModuleWithCache(
          `${input.tokenId}:narrative`,
          MODULE_TTLS_MS.narrative,
          () => this.narrativeModule.evaluate({ tokenId: input.tokenId, chain: input.chain as "solana" | "bsc" | "eth", name: context.name, symbol: context.symbol }),
          "Narrative module could not process this token in the current cycle.",
        )
      : fallbackNarrativeModule;
    const dca = await this.evaluateModuleWithCache(
      `${input.tokenId}:dca`,
      MODULE_TTLS_MS.dca,
      () => this.dcaModule.evaluate({ tokenId: input.tokenId, tokenAddress: context.tokenAddress, chain: input.chain }),
      "DCA module could not process this token in the current cycle.",
    );
    const wash = await this.evaluateModuleWithCache(
      `${input.tokenId}:wash`,
      MODULE_TTLS_MS.wash,
      () => this.washModule.evaluate({ tokenId: input.tokenId, tokenAddress: context.tokenAddress, chain: input.chain, creatorAddress: context.creatorAddress }),
      "Wash detector could not process this token in the current cycle.",
    );
    const retention = await this.evaluateModuleWithCache(
      `${input.tokenId}:retention`,
      MODULE_TTLS_MS.retention,
      () => this.retentionModule.evaluate({ tokenId: input.tokenId, tokenAddress: context.tokenAddress, chain: input.chain, tokenAgeHours: context.tokenAge }),
      "Retention tracker could not process this token in the current cycle.",
    );
    const divergence = await this.evaluateModuleWithCache(
      `${input.tokenId}:divergence`,
      MODULE_TTLS_MS.divergence,
      () => this.divergenceModule.evaluate({ tokenId: input.tokenId, tokenAddress: context.tokenAddress, chain: input.chain, pairId: context.pairId }),
      "Momentum divergence monitor could not process this token in the current cycle.",
    );

    return { cabal, drain, conviction, narrative, dca, wash, retention, divergence };
  }

  private getCachedModuleResult(cacheKey: string): ModuleResult | undefined {
    const cached = this.moduleResultCache.get(cacheKey);
    if (!cached || cached.expiresAt <= Date.now()) {
      this.moduleResultCache.delete(cacheKey);
      return undefined;
    }

    return cached.result;
  }

  private invalidateModuleCache(tokenId: string, modules: ModuleName[]): void {
    modules.forEach((module) => {
      this.moduleResultCache.delete(`${tokenId}:${module}`);
    });
  }

  private scheduleOverviewBroadcast(): void {
    if (this.overviewListeners.size === 0 || this.overviewBroadcastTimer) {
      return;
    }

    this.overviewBroadcastTimer = setTimeout(() => {
      this.overviewBroadcastTimer = null;
      const overview = this.getOverview(50);
      this.overviewListeners.forEach((listener) => listener(overview));
    }, OVERVIEW_BROADCAST_DEBOUNCE_MS);
  }

  private pruneDataOutsideWatchlist(): void {
    const allowedTokenIds = new Set(this.repository.getWatchlist().map((token) => token.tokenId));
    this.repository.pruneByTokenIds(allowedTokenIds);
    [...this.moduleResultCache.keys()].forEach((cacheKey) => {
      const tokenId = cacheKey.split(":")[0];
      if (!allowedTokenIds.has(tokenId)) {
        this.moduleResultCache.delete(cacheKey);
      }
    });
  }

  private async evaluateModuleWithCache(
    cacheKey: string,
    ttlMs: number,
    evaluator: () => Promise<ModuleResult>,
    failureSummary: string,
  ): Promise<ModuleResult> {
    const cached = this.getCachedModuleResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await evaluator();
      this.moduleResultCache.set(cacheKey, { result, expiresAt: Date.now() + ttlMs });
      return result;
    } catch (error) {
      this.logger.warn("Module evaluation failed", { cacheKey, error: String(error) });
      const fallback = safeModuleResult(failureSummary);
      this.moduleResultCache.set(cacheKey, { result: fallback, expiresAt: Date.now() + 60_000 });
      return fallback;
    }
  }
}
