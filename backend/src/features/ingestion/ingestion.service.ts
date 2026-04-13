import { TRENDING_CHAINS, type SupportedChain } from "../../shared/constants/chains.constants";
import type { Logger } from "../../shared/logger/logger";
import type { AveDataClient } from "../../shared/clients/ave/ave-client";
import type { TokenSummary } from "../../shared/clients/ave/ave-client.types";
import type { MonitoringService } from "../monitoring/monitoring.service";
import type { WatchlistToken } from "../monitoring/monitoring.types";
import type { AveWssManager } from "./wss/ave-wss-manager";
import type { IngestionLifecycle } from "./ingestion.types";
import {
  buildSubscriptionTargets,
  eventChain,
  eventPairAddress,
  eventTokenAddress,
  type WssSubscriptionTarget,
  type WssTopic,
  watchlistTokenKey,
} from "./wss/wss-routing.utils";

const WATCHLIST_REFRESH_MS = 300_000;
const MIN_MAIN_PAIR_TVL = 10_000;
const MIN_TOKEN_AGE_SECONDS = 15 * 60;
const REALTIME_PENDING_RETRY_MS = 1_500;
const FULL_MODEL_REFRESH_COOLDOWN_MS = 300_000;
const TOPIC_REANALYZE_COOLDOWN_MS: Record<WssTopic, number> = {
  liq: 30_000,
  tx: 120_000,
  multi_tx: 45_000,
};
const CURATED_SYSTEM_TOKENS: Array<{ tokenId: string; chain: SupportedChain }> = [
  { tokenId: "So11111111111111111111111111111111111111112-solana", chain: "solana" },
  { tokenId: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v-solana", chain: "solana" },
  { tokenId: "9AwxXyhehSMyoKH54doKGg4fCetxvPGtUPFt77Rpump-solana", chain: "solana" },
  { tokenId: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN-solana", chain: "solana" },
  { tokenId: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c-bsc", chain: "bsc" },
  { tokenId: "0x55d398326f99059ff775485246999027b3197955-bsc", chain: "bsc" },
  { tokenId: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82-bsc", chain: "bsc" },
  { tokenId: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2-eth", chain: "eth" },
  { tokenId: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-eth", chain: "eth" },
  { tokenId: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599-eth", chain: "eth" },
  { tokenId: "0x6982508145454ce325ddbe47a25d4ec3d2311933-eth", chain: "eth" },
];

const dedupeTokens = (tokens: WatchlistToken[]): WatchlistToken[] => {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    const key = watchlistTokenKey(token);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const toNumber = (value: number | string | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const toUnixSeconds = (value: number | string | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1_000) : Math.floor(value);
  }

  if (typeof value !== "string" || value.length === 0) {
    return 0;
  }

  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) {
    return numeric > 1_000_000_000_000 ? Math.floor(numeric / 1_000) : Math.floor(numeric);
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1_000) : 0;
};

const isMatureToken = (createdAt: number | string | undefined): boolean => {
  const unix = toUnixSeconds(createdAt);
  if (unix <= 0) {
    return true;
  }

  return Math.floor(Date.now() / 1_000) - unix >= MIN_TOKEN_AGE_SECONDS;
};

interface WatchlistCandidate {
  token: WatchlistToken;
  tvlUsd: number;
  volume24hUsd: number;
}

const toWatchlistCandidate = (token: TokenSummary): WatchlistCandidate | null => {
  if (!token.token || !token.chain) {
    return null;
  }

  const tvlUsd = toNumber(token.main_pair_tvl);
  const volume24hUsd = toNumber(token.token_tx_volume_usd_24h ?? token.tx_volume_u_24h);

  return {
    token: {
      tokenId: `${token.token}-${token.chain}`,
      chain: token.chain,
      tokenAddress: token.token,
      symbol: token.symbol,
      name: token.name,
      mainPair: token.main_pair,
      mainPairTvl: tvlUsd,
      createdAt: token.created_at,
    },
    tvlUsd,
    volume24hUsd,
  };
};

const blendMomentumAndLiquidity = (candidates: WatchlistCandidate[]): WatchlistToken[] => {
  const byVolume = [...candidates].sort((left, right) => right.volume24hUsd - left.volume24hUsd);
  const byTvl = [...candidates].sort((left, right) => right.tvlUsd - left.tvlUsd);
  const merged: WatchlistToken[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(byVolume.length, byTvl.length);

  for (let index = 0; index < maxLength; index += 1) {
    [byVolume[index], byTvl[index]].forEach((candidate) => {
      if (!candidate || seen.has(candidate.token.tokenId)) {
        return;
      }

      seen.add(candidate.token.tokenId);
      merged.push(candidate.token);
    });
  }

  return merged;
};

const pickBalanced = (chains: Record<string, WatchlistToken[]>, limit: number): WatchlistToken[] => {
  const selected: WatchlistToken[] = [];
  let pointer = 0;

  while (selected.length < limit) {
    let pickedInRound = false;
    TRENDING_CHAINS.forEach((chain) => {
      const token = chains[chain]?.[pointer];
      if (!token || selected.length >= limit) {
        return;
      }

      selected.push(token);
      pickedInRound = true;
    });

    if (!pickedInRound) {
      break;
    }

    pointer += 1;
  }

  return selected;
};

const topicToTrigger = (
  topic: WssTopic,
): "wss_liq" | "wss_tx" | "wss_multi_tx" => {
  if (topic === "liq") {
    return "wss_liq";
  }

  if (topic === "tx") {
    return "wss_tx";
  }

  return "wss_multi_tx";
};

export class IngestionService implements IngestionLifecycle {
  private timer: NodeJS.Timeout | null = null;
  private realtimePendingTimer: NodeJS.Timeout | null = null;
  private lastWatchlistRefreshAt = 0;
  private readonly activeSubscriptions = new Map<string, WssSubscriptionTarget>();
  private readonly realtimeCooldownUntil = new Map<string, number>();
  private readonly realtimePending = new Map<string, { token: WatchlistToken; topic: WssTopic }>();
  private readonly realtimeInFlight = new Set<string>();
  private realtimeTriggeredScans = 0;
  private bootstrapping = true;
  private fullRefreshInFlight = false;
  private lastFullModelRefreshAt = 0;

  public constructor(
    private readonly client: AveDataClient,
    private readonly monitoringService: MonitoringService,
    private readonly logger: Logger,
    private readonly pollIntervalMs: number,
    private readonly watchlistLimit: number,
    private readonly wssManager?: AveWssManager,
  ) {}

  public async start(): Promise<void> {
    try {
      this.bootstrapping = true;
      if (this.monitoringService.getSystemWatchlist().length === 0) {
        this.monitoringService.setSystemWatchlist(await this.buildWatchlist());
        this.lastWatchlistRefreshAt = Date.now();
      }

      this.syncRealtimeSubscriptions();
      this.wssManager?.connect();
      await this.runNow();
      this.lastFullModelRefreshAt = Date.now();
      this.bootstrapping = false;
    } catch (error) {
      this.bootstrapping = false;
      this.logger.warn("Initial monitoring cycle failed", { error: String(error) });
    }

    if (this.pollIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.runNow().catch((error) => {
          this.logger.warn("Scheduled monitoring cycle failed", { error: String(error) });
        });
      }, this.pollIntervalMs);
    }
    this.logger.info("Ingestion service started", {
      pollIntervalMs: this.pollIntervalMs,
      pollingEnabled: this.pollIntervalMs > 0,
      realtime: this.wssManager !== undefined,
    });
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.stopRealtimePendingTimer();
    this.unsubscribeAllRealtimeTargets();
    this.wssManager?.close();
  }

  public async runNow(): Promise<void> {
    const systemWatchlist = this.monitoringService.getSystemWatchlist();
    const shouldRefreshWatchlist = systemWatchlist.length === 0 || Date.now() - this.lastWatchlistRefreshAt > WATCHLIST_REFRESH_MS;
    if (shouldRefreshWatchlist) {
      this.monitoringService.setSystemWatchlist(await this.buildWatchlist());
      this.lastWatchlistRefreshAt = Date.now();
    }

    this.syncRealtimeSubscriptions();
    const snapshots = await this.monitoringService.runWatchlistCycle();
    this.logger.info("Monitoring cycle complete", {
      snapshots: snapshots.length,
      realtimeScans: this.realtimeTriggeredScans,
      ...(this.wssManager ? { realtime: this.wssManager.getStatus() } : {}),
    });
  }

  private syncRealtimeSubscriptions(): void {
    if (!this.wssManager) {
      return;
    }

    const targets = this.monitoringService.getWatchlist().flatMap((token) => buildSubscriptionTargets(token));
    const nextTargets = new Map<string, WssSubscriptionTarget>();
    targets.forEach((target) => nextTargets.set(target.key, target));

    [...this.activeSubscriptions.entries()].forEach(([key, target]) => {
      if (nextTargets.has(key)) {
        return;
      }

      this.wssManager?.unsubscribe(target.topic, [target.identifier, target.chain]);
      this.activeSubscriptions.delete(key);
      this.clearRealtimeStateForToken(target.token);
    });

    nextTargets.forEach((target, key) => {
      if (!this.activeSubscriptions.has(key)) {
        this.wssManager?.subscribe(target.topic, [target.identifier, target.chain], (payload) =>
          this.handleRealtimeEvent(target, payload),
        );
      }

      this.activeSubscriptions.set(key, target);
    });
  }

  private handleRealtimeEvent(target: WssSubscriptionTarget, payload: Record<string, unknown>): void {
    if (this.bootstrapping) {
      return;
    }

    const payloadChain = eventChain(payload);
    if (!payloadChain || payloadChain !== target.chain) {
      return;
    }

    const identifier = target.topic === "multi_tx" ? eventTokenAddress(payload) : eventPairAddress(payload);
    if (!identifier || identifier !== target.identifier) {
      return;
    }

    this.scheduleRealtimeAnalysis(target.token, target.topic);
    this.scheduleEventDrivenFullRefresh();
  }

  private scheduleRealtimeAnalysis(token: WatchlistToken, topic: WssTopic): void {
    const key = watchlistTokenKey(token);
    const now = Date.now();
    if (this.realtimeInFlight.has(key)) {
      this.realtimePending.set(key, { token, topic });
      return;
    }

    const cooldownUntil = this.realtimeCooldownUntil.get(key) ?? 0;
    if (now < cooldownUntil) {
      this.realtimePending.set(key, { token, topic });
      this.scheduleRealtimePendingFlush(cooldownUntil - now + REALTIME_PENDING_RETRY_MS);
      return;
    }

    this.realtimeCooldownUntil.set(key, now + TOPIC_REANALYZE_COOLDOWN_MS[topic]);
    this.triggerRealtimeAnalysis(token, topic);
  }

  private triggerRealtimeAnalysis(token: WatchlistToken, topic: WssTopic): void {
    const key = watchlistTokenKey(token);
    this.realtimeInFlight.add(key);
    this.realtimeTriggeredScans += 1;

    void this.monitoringService
      .analyzeTokenFromRealtime(token, topicToTrigger(topic))
      .catch((error) => {
        this.logger.warn("Realtime WSS scan failed", { tokenId: token.tokenId, chain: token.chain, topic, error: String(error) });
      })
      .finally(() => {
        this.realtimeInFlight.delete(key);
        const pending = this.realtimePending.get(key);
        if (!pending) {
          return;
        }

        this.realtimePending.delete(key);
        this.scheduleRealtimeAnalysis(pending.token, pending.topic);
      });
  }

  private scheduleRealtimePendingFlush(delayMs: number): void {
    if (this.realtimePendingTimer) {
      return;
    }

    this.realtimePendingTimer = setTimeout(() => {
      this.realtimePendingTimer = null;
      this.flushRealtimePending();
    }, Math.max(delayMs, REALTIME_PENDING_RETRY_MS));
  }

  private flushRealtimePending(): void {
    if (this.realtimePending.size === 0) {
      return;
    }

    let nextDelay = REALTIME_PENDING_RETRY_MS;
    const now = Date.now();
    [...this.realtimePending.entries()].forEach(([key, pending]) => {
      if (this.realtimeInFlight.has(key)) {
        return;
      }

      const cooldownUntil = this.realtimeCooldownUntil.get(key) ?? 0;
      if (now >= cooldownUntil) {
        this.realtimePending.delete(key);
        this.scheduleRealtimeAnalysis(pending.token, pending.topic);
        return;
      }

      nextDelay = Math.min(nextDelay, Math.max(cooldownUntil - now, REALTIME_PENDING_RETRY_MS));
    });

    if (this.realtimePending.size > 0) {
      this.scheduleRealtimePendingFlush(nextDelay);
    }
  }

  private stopRealtimePendingTimer(): void {
    if (!this.realtimePendingTimer) {
      return;
    }

    clearTimeout(this.realtimePendingTimer);
    this.realtimePendingTimer = null;
  }

  private clearRealtimeStateForToken(token: WatchlistToken): void {
    const key = watchlistTokenKey(token);
    this.realtimeCooldownUntil.delete(key);
    this.realtimePending.delete(key);
    this.realtimeInFlight.delete(key);
  }

  private unsubscribeAllRealtimeTargets(): void {
    if (!this.wssManager) {
      return;
    }

    this.activeSubscriptions.forEach((target) => {
      this.wssManager?.unsubscribe(target.topic, [target.identifier, target.chain]);
    });
    this.activeSubscriptions.clear();
    this.realtimeCooldownUntil.clear();
    this.realtimePending.clear();
    this.realtimeInFlight.clear();
    this.fullRefreshInFlight = false;
    this.lastFullModelRefreshAt = 0;
  }

  private scheduleEventDrivenFullRefresh(): void {
    const now = Date.now();
    if (this.fullRefreshInFlight || now - this.lastFullModelRefreshAt < FULL_MODEL_REFRESH_COOLDOWN_MS) {
      return;
    }

    this.fullRefreshInFlight = true;
    this.lastFullModelRefreshAt = now;
    this.monitoringService.clearModuleCache();
    void this.monitoringService
      .runWatchlistCycle()
      .then((snapshots) => {
        this.logger.info("Event-driven full model refresh complete", { snapshots: snapshots.length });
      })
      .catch((error) => {
        this.logger.warn("Event-driven full model refresh failed", { error: String(error) });
      })
      .finally(() => {
        this.fullRefreshInFlight = false;
      });
  }

  private async buildWatchlist(): Promise<WatchlistToken[]> {
    const curated = await this.buildCuratedWatchlist();
    const tokenSets = await Promise.all(TRENDING_CHAINS.map((chain) => this.client.listTrending({ chain, pageSize: 100 })));
    const candidatesByChain = TRENDING_CHAINS.reduce<Record<string, WatchlistToken[]>>((accumulator, chain, index) => {
      const mapped = tokenSets[index]
        .map(toWatchlistCandidate)
        .filter((candidate): candidate is WatchlistCandidate => candidate !== null)
        .filter((candidate) => typeof candidate.token.mainPair === "string" && candidate.token.mainPair.length > 0);

      const matureAndLiquid = mapped.filter(
        (candidate) => candidate.tvlUsd >= MIN_MAIN_PAIR_TVL && isMatureToken(candidate.token.createdAt),
      );
      const source = matureAndLiquid.length > 0 ? matureAndLiquid : mapped;
      accumulator[chain] = blendMomentumAndLiquidity(source);
      return accumulator;
    }, {});

    const trending = dedupeTokens(pickBalanced(candidatesByChain, this.watchlistLimit * 2));
    return dedupeTokens([...curated, ...trending]).slice(0, this.watchlistLimit);
  }

  private async buildCuratedWatchlist(): Promise<WatchlistToken[]> {
    const seeded = await Promise.all(
      CURATED_SYSTEM_TOKENS.map(async (token) => {
        try {
          const details = await this.client.getTokenDetails(token.tokenId);
          if (!details.token) {
            return null;
          }

          return {
            tokenId: token.tokenId,
            chain: token.chain,
            tokenAddress: details.token,
            symbol: details.symbol,
            name: details.name,
            mainPair: details.main_pair,
            mainPairTvl: toNumber(details.main_pair_tvl),
            createdAt: details.created_at,
          } as WatchlistToken;
        } catch (error) {
          this.logger.warn("Curated token seed skipped", { tokenId: token.tokenId, error: String(error) });
          return null;
        }
      }),
    );

    return seeded.filter((token): token is WatchlistToken => token !== null);
  }
}
