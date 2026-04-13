import { URLSearchParams } from "node:url";
import { TimedCache } from "./ave-cache";
import { AppError } from "../../errors/app-error";
import type { Logger } from "../../logger/logger";
import type { SupportedChain } from "../../constants/chains.constants";
import type {
  AddressPnl,
  AddressPnlQuery,
  AddressTx,
  AddressTxQuery,
  ApiEnvelope,
  ContractInfo,
  KlinePoint,
  LiquidityTx,
  LiquidityTxQuery,
  SmartWalletInfo,
  SmartWalletQuery,
  TokenSummary,
  TopHolder,
  TrendingQuery,
} from "./ave-client.types";

const REQUEST_RETRY_COUNT = 2;
const REQUEST_RETRY_MS = 400;
const REQUEST_TIMEOUT_MS = 12_000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const TOKEN_CACHE_TTL_MS = 60_000;
const CONTRACT_CACHE_TTL_MS = 86_400_000;
const SMART_WALLET_CACHE_TTL_MS = 21_600_000;
const KLINE_CACHE_TTL_MS = 600_000;
const TRENDING_CACHE_TTL_MS = 20_000;

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const toRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const toSupportedChain = (value: unknown): SupportedChain | undefined => {
  const chain = toStringValue(value)?.toLowerCase();
  if (chain === "solana" || chain === "bsc" || chain === "eth" || chain === "base") {
    return chain;
  }

  return undefined;
};

const toNestedArray = <T>(value: unknown, keys: string[]): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as T[];
    }
  }

  return [];
};

const unwrapData = <T>(payload: unknown): T => {
  if (Array.isArray(payload)) {
    return payload as T;
  }

  const wrapped = payload as ApiEnvelope<T>;
  return wrapped?.data !== undefined ? wrapped.data : (payload as T);
};

const normalizeTokenSummary = (value: unknown): TokenSummary | null => {
  const container = toRecord(value);
  if (!container) {
    return null;
  }

  const tokenBody = toRecord(container.token) ?? container;
  const firstPair = toArray<unknown>(container.pairs).map(toRecord).find((pair) => pair !== null) ?? null;
  const tokenAddress = toStringValue(tokenBody.token) ?? toStringValue(container.token);
  const chain = toSupportedChain(tokenBody.chain) ?? toSupportedChain(container.chain) ?? toSupportedChain(firstPair?.chain);
  if (!tokenAddress || !chain) {
    return null;
  }

  const symbol = toStringValue(tokenBody.symbol) ?? toStringValue(tokenBody.token_symbol) ?? tokenAddress.slice(0, 6);
  const name = toStringValue(tokenBody.name) ?? toStringValue(tokenBody.token_name) ?? symbol;

  return {
    token: tokenAddress,
    chain,
    name,
    symbol,
    current_price_usd: toStringValue(tokenBody.current_price_usd),
    market_cap: toStringValue(tokenBody.market_cap),
    holders: toNumberValue(tokenBody.holders),
    main_pair: toStringValue(tokenBody.main_pair) ?? toStringValue(firstPair?.pair),
    main_pair_tvl:
      typeof tokenBody.main_pair_tvl === "number" || typeof tokenBody.main_pair_tvl === "string"
        ? tokenBody.main_pair_tvl
        : typeof tokenBody.tvl === "number" || typeof tokenBody.tvl === "string"
          ? tokenBody.tvl
          : undefined,
    created_at: tokenBody.created_at as number | string | undefined,
    updated_at: toNumberValue(tokenBody.updated_at),
    tx_volume_u_24h:
      typeof tokenBody.tx_volume_u_24h === "number" || typeof tokenBody.tx_volume_u_24h === "string"
        ? tokenBody.tx_volume_u_24h
        : undefined,
    token_tx_volume_usd_24h:
      typeof tokenBody.token_tx_volume_usd_24h === "number" || typeof tokenBody.token_tx_volume_usd_24h === "string"
        ? tokenBody.token_tx_volume_usd_24h
        : undefined,
  };
};

const normalizeTokenList = (payload: unknown): TokenSummary[] => {
  const rawTokens = toNestedArray<unknown>(payload, ["tokens", "result"]);
  return rawTokens.map(normalizeTokenSummary).filter((token): token is TokenSummary => token !== null);
};

export class AveDataClient {
  private readonly trendingCache = new TimedCache<TokenSummary[]>();
  private readonly tokenCache = new TimedCache<TokenSummary>();
  private readonly contractCache = new TimedCache<ContractInfo>();
  private readonly smartWalletCache = new TimedCache<SmartWalletInfo[]>();
  private readonly klineCache = new TimedCache<KlinePoint[]>();

  public constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly logger: Logger) {}

  public async listTrending(query: TrendingQuery): Promise<TokenSummary[]> {
    const cacheKey = `${query.chain}:${query.pageSize ?? 100}`;
    const hit = this.trendingCache.get(cacheKey);
    if (hit) {
      return hit;
    }

    const data = await this.request<unknown>("/v2/tokens/trending", { chain: query.chain, page_size: String(query.pageSize ?? 100) });
    const tokens = normalizeTokenList(data);
    this.trendingCache.set(cacheKey, tokens, TRENDING_CACHE_TTL_MS);
    return tokens;
  }

  public async listPlatformTokens(tag: string, limit = 100): Promise<TokenSummary[]> {
    const data = await this.request<unknown>("/v2/tokens/platform", { tag, limit: String(limit) });
    return normalizeTokenList(data);
  }

  public async searchTokens(keyword: string): Promise<TokenSummary[]> {
    const data = await this.request<unknown>("/v2/tokens", { keyword });
    return normalizeTokenList(data);
  }

  public async getTokenDetails(tokenId: string): Promise<TokenSummary> {
    const hit = this.tokenCache.get(tokenId);
    if (hit) {
      return hit;
    }

    const data = await this.request<unknown>(`/v2/tokens/${tokenId}`);
    const token = normalizeTokenSummary(data);
    if (!token) {
      throw new AppError({
        statusCode: 502,
        code: "AVE_TOKEN_PAYLOAD_INVALID",
        message: `AVE token payload was invalid for ${tokenId}`,
      });
    }

    this.tokenCache.set(tokenId, token, TOKEN_CACHE_TTL_MS);
    return token;
  }

  public async getContracts(tokenId: string): Promise<ContractInfo> {
    const hit = this.contractCache.get(tokenId);
    if (hit) {
      return hit;
    }

    const contract = await this.request<ContractInfo>(`/v2/contracts/${tokenId}`);
    this.contractCache.set(tokenId, contract, CONTRACT_CACHE_TTL_MS);
    return contract;
  }

  public async getTopHolders(tokenId: string): Promise<TopHolder[]> {
    try {
      const data = await this.request<TopHolder[]>(`/v2/tokens/top100/${tokenId}`);
      return toArray<TopHolder>(data);
    } catch (error) {
      if (this.isNoDataError(error)) {
        return [];
      }

      throw error;
    }
  }

  public async getAddressTx(query: AddressTxQuery): Promise<AddressTx[]> {
    try {
      const data = await this.request<AddressTx[]>("/v2/address/tx", { wallet_address: query.walletAddress, chain: query.chain, token_address: query.tokenAddress, page_size: String(query.pageSize ?? 100), ...(query.fromTime ? { from_time: String(query.fromTime) } : {}) });
      return toNestedArray<AddressTx>(data, ["result", "txs"]);
    } catch (error) {
      if (this.isNoDataError(error)) {
        return [];
      }

      throw error;
    }
  }

  public async getAddressPnl(query: AddressPnlQuery): Promise<AddressPnl> {
    try {
      return await this.request<AddressPnl>("/v2/address/pnl", { wallet_address: query.walletAddress, chain: query.chain, token_address: query.tokenAddress });
    } catch (error) {
      if (this.isNoDataError(error)) {
        return {};
      }

      throw error;
    }
  }

  public async getSmartWallets(query: SmartWalletQuery): Promise<SmartWalletInfo[]> {
    const cacheKey = `${query.chain}:${query.pageSize ?? 50}`;
    const hit = this.smartWalletCache.get(cacheKey);
    if (hit) {
      return hit;
    }

    const data = await this.request<SmartWalletInfo[]>("/v2/address/smart_wallet/list", { chain: query.chain, page_size: String(query.pageSize ?? 50), sort: "total_profit", sort_dir: "desc" });
    const wallets = toArray<SmartWalletInfo>(data);
    this.smartWalletCache.set(cacheKey, wallets, SMART_WALLET_CACHE_TTL_MS);
    return wallets;
  }

  public async getTokenKlines(tokenId: string, limit = 120): Promise<KlinePoint[]> {
    const cacheKey = `${tokenId}:${limit}`;
    const hit = this.klineCache.get(cacheKey);
    if (hit) {
      return hit;
    }

    try {
      const data = await this.request<KlinePoint[]>(`/v2/klines/token/${tokenId}`, { interval: "60", limit: String(limit) });
      const klines = toNestedArray<KlinePoint>(data, ["points", "result"]);
      this.klineCache.set(cacheKey, klines, KLINE_CACHE_TTL_MS);
      return klines;
    } catch (error) {
      if (this.isNoDataError(error)) {
        this.klineCache.set(cacheKey, [], KLINE_CACHE_TTL_MS);
        return [];
      }

      throw error;
    }
  }

  public async getLiquidityTxs(query: LiquidityTxQuery): Promise<LiquidityTx[]> {
    try {
      const data = await this.request<LiquidityTx[]>(`/v2/txs/liq/${query.pairId}`, { page_size: String(query.pageSize ?? 100), type: "all", ...(query.fromTime ? { from_time: String(query.fromTime) } : {}) });
      return toNestedArray<LiquidityTx>(data, ["txs", "result"]);
    } catch (error) {
      if (this.isNoDataError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async request<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = `${this.baseUrl}${path}${query ? `?${new URLSearchParams(query).toString()}` : ""}`;
    for (let attempt = 0; attempt <= REQUEST_RETRY_COUNT; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(url, { headers: { "X-API-KEY": this.apiKey, Accept: "application/json" }, signal: controller.signal }).finally(() => clearTimeout(timeout));
      if (response.ok) {
        return unwrapData<T>(await response.json());
      }

      if (attempt === REQUEST_RETRY_COUNT || !RETRYABLE_STATUSES.has(response.status)) {
        throw new AppError({ statusCode: response.status, code: "AVE_API_REQUEST_FAILED", message: `AVE API request failed for ${path}`, details: { status: response.status, body: await response.text() } });
      }

      this.logger.warn("AVE API temporary failure, retrying", { path, attempt, status: response.status });
      await sleep(REQUEST_RETRY_MS * (attempt + 1) + Math.floor(Math.random() * 120));
    }

    throw new AppError({ statusCode: 500, code: "AVE_API_RETRY_EXHAUSTED", message: "AVE API retries exhausted" });
  }

  private isNoDataError(error: unknown): boolean {
    return error instanceof AppError && (error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 422);
  }
}
