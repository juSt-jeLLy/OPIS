import type { Request, Response } from "express";
import type { MonitoringService } from "./monitoring.service";
import type { SupportedChain } from "../../shared/constants/chains.constants";
import { AppError } from "../../shared/errors/app-error";
import { resolveUserId } from "../../shared/http/user-id";
import type { WatchlistPersistenceRepository } from "../persistence/watchlist-persistence.repository";

const parseLimit = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseChain = (value: unknown): SupportedChain => {
  const chain = String(value ?? "").toLowerCase();
  if (chain === "solana" || chain === "bsc" || chain === "eth" || chain === "base") {
    return chain;
  }

  throw new AppError({ statusCode: 400, code: "INVALID_CHAIN", message: `Unsupported chain: ${chain}` });
};

const parseOptionalChain = (value: unknown): SupportedChain | undefined => {
  const chain = String(value ?? "").trim();
  if (chain.length === 0 || chain.toLowerCase() === "all") {
    return undefined;
  }

  return parseChain(chain);
};

const parseWatchlistEntry = (value: unknown): {
  tokenId: string;
  chain: SupportedChain;
  tokenAddress?: string;
  symbol?: string;
  name?: string;
  mainPair?: string;
  mainPairTvl?: number;
  createdAt?: number | string;
  executionMode?: "trade" | "delegate_exit";
  assetsId?: string;
  buyAmountAtomic?: string;
  sellAmountAtomic?: string;
} => {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const chain = parseChain(record.chain);
  const tokenId = String(record.tokenId ?? "");
  return {
    tokenId: tokenId.length === 0 ? "" : tokenId.includes("-") ? tokenId : `${tokenId}-${chain}`,
    chain,
    tokenAddress: typeof record.tokenAddress === "string" ? record.tokenAddress : undefined,
    symbol: typeof record.symbol === "string" ? record.symbol : undefined,
    name: typeof record.name === "string" ? record.name : undefined,
    mainPair: typeof record.mainPair === "string" ? record.mainPair : undefined,
    mainPairTvl: typeof record.mainPairTvl === "number" ? record.mainPairTvl : undefined,
    createdAt:
      typeof record.createdAt === "string" || typeof record.createdAt === "number"
        ? record.createdAt
        : undefined,
    executionMode: record.executionMode === "delegate_exit" ? "delegate_exit" : "trade",
    assetsId: typeof record.assetsId === "string" ? record.assetsId : undefined,
    buyAmountAtomic: typeof record.buyAmountAtomic === "string" ? record.buyAmountAtomic : undefined,
    sellAmountAtomic: typeof record.sellAmountAtomic === "string" ? record.sellAmountAtomic : undefined,
  };
};

export class MonitoringController {
  public constructor(
    private readonly service: MonitoringService,
    private readonly defaultUserId: string,
    private readonly watchlistPersistence?: WatchlistPersistenceRepository,
  ) {}

  private async loadWatchlistIfMissing(userId: string): Promise<void> {
    if (!this.watchlistPersistence || this.service.getUserWatchlist(userId).length > 0) {
      return;
    }

    const stored = await this.watchlistPersistence.loadUserWatchlist(userId);
    if (stored.length > 0) {
      this.service.replaceUserWatchlist(userId, stored);
    }
  }

  public getOverview(request: Request, response: Response): void {
    response.json(this.service.getOverview(parseLimit(request.query.limit, 30)));
  }

  public streamOverview(request: Request, response: Response): void {
    const userId = resolveUserId(request, this.defaultUserId);
    const signalLimit = parseLimit(request.query.signalLimit, 80);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();

    const emit = (overviewPayload = this.service.getOverview(50)): void => {
      const payload = {
        overview: overviewPayload,
        signals: this.service.getSignals(signalLimit, userId),
      };
      response.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    emit();
    const unsubscribe = this.service.subscribeOverview((overview) => emit(overview));
    request.on("close", () => {
      unsubscribe();
    });
  }

  public getSignals(request: Request, response: Response): void {
    const userId = resolveUserId(request, this.defaultUserId);
    response.json({ signals: this.service.getSignals(parseLimit(request.query.limit, 50), userId) });
  }

  public getAlerts(request: Request, response: Response): void {
    response.json({ alerts: this.service.getAlerts(parseLimit(request.query.limit, 30)) });
  }

  public async getWatchlist(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    await this.loadWatchlistIfMissing(userId);
    response.json(this.service.getWatchlists(userId));
  }

  public async searchTokens(request: Request, response: Response): Promise<void> {
    const query = String(request.query.q ?? "");
    const chain = parseOptionalChain(request.query.chain);
    const limit = Math.min(parseLimit(request.query.limit, 30), 60);
    const tokens = await this.service.searchTokens(query, chain, limit);
    response.json({ tokens });
  }

  public async replaceWatchlist(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    const rawTokens: unknown[] = Array.isArray(request.body?.tokens) ? request.body.tokens : [];
    const tokens = rawTokens.map(parseWatchlistEntry).filter((token) => token.tokenId.length > 0);
    this.service.replaceUserWatchlist(userId, tokens);
    await this.watchlistPersistence?.replaceUserWatchlist(userId, tokens);
    response.status(202).json(this.service.getWatchlists(userId));
  }

  public async analyzeToken(request: Request, response: Response): Promise<void> {
    const chain = parseChain(request.body?.chain);
    const rawTokenId = String(request.body?.tokenId ?? "").trim();
    if (rawTokenId.length === 0) {
      throw new AppError({ statusCode: 400, code: "TOKEN_ID_REQUIRED", message: "tokenId is required" });
    }
    const tokenId = rawTokenId.includes("-") ? rawTokenId : `${rawTokenId}-${chain}`;

    const snapshot = await this.service.analyzeToken({
      tokenId,
      chain,
      tokenAddress: typeof request.body?.tokenAddress === "string" ? request.body.tokenAddress : undefined,
      symbol: typeof request.body?.symbol === "string" ? request.body.symbol : undefined,
      name: typeof request.body?.name === "string" ? request.body.name : undefined,
      mainPair: typeof request.body?.mainPair === "string" ? request.body.mainPair : undefined,
      mainPairTvl: typeof request.body?.mainPairTvl === "number" ? request.body.mainPairTvl : undefined,
      createdAt:
        typeof request.body?.createdAt === "string" || typeof request.body?.createdAt === "number"
          ? request.body.createdAt
          : undefined,
    });
    response.status(202).json({ snapshot });
  }

  public async runWatchlistCycle(_request: Request, response: Response): Promise<void> {
    const snapshots = await this.service.runWatchlistCycle();
    response.status(202).json({ snapshots, count: snapshots.length });
  }
}
