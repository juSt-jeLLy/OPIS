import { URLSearchParams } from "node:url";
import { AppError } from "../../errors/app-error";
import type { Logger } from "../../logger/logger";
import { createDelegateSignature } from "./ave-trading-signing";
import type {
  AutoGasTier,
  AveTradingEnvelope,
  CreateDelegateWalletRequest,
  CreateDelegateWalletResponse,
  DelegateUserInfo,
  QuoteRequest,
  QuoteResponse,
  SendSwapOrderRequest,
  SendSwapOrderResponse,
  SwapOrderStatus,
} from "./ave-trading.types";

const REQUEST_TIMEOUT_MS = 12_000;
const REQUEST_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const SUCCESS_CODES = new Set([0, 200]);
const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class AveTradingClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly apiSecret: string | undefined,
    private readonly logger: Logger,
  ) {}

  /** Returns estimated output amount and spender contract for approvals. */
  public async quote(input: QuoteRequest): Promise<QuoteResponse> {
    return this.request<QuoteResponse>("/v1/thirdParty/chainWallet/getAmountOut", { method: "POST", body: input });
  }

  /** Returns recommended gas tiers for each chain/mev mode. */
  public async getGasTips(): Promise<AutoGasTier[]> {
    return this.request<AutoGasTier[]>("/v1/thirdParty/chainWallet/getGasTip", { method: "GET" });
  }

  /** Places a delegate-wallet market order and returns order id. */
  public async sendSwapOrder(input: SendSwapOrderRequest): Promise<SendSwapOrderResponse> {
    return this.request<SendSwapOrderResponse>("/v1/thirdParty/tx/sendSwapOrder", { method: "POST", body: input, signed: true });
  }

  /** Fetches market order states for one or more order ids. */
  public async getSwapOrders(chain: string, ids: string[]): Promise<SwapOrderStatus[]> {
    return this.request<SwapOrderStatus[]>("/v1/thirdParty/tx/getSwapOrder", {
      method: "GET",
      signed: true,
      query: { chain, ids: ids.join(",") },
    });
  }

  /** Validates that the delegate wallet assetsId exists and is accessible. */
  public async getUserByAssetsId(assetsId: string): Promise<DelegateUserInfo | null> {
    const response = await this.request<DelegateUserInfo[]>(
      "/v1/thirdParty/user/getUserByAssetsId",
      { method: "GET", signed: true, query: { assetsIds: assetsId } },
    );
    return response[0] ?? null;
  }

  /** Creates a new delegate wallet (proxy wallet) under the API organization. */
  public async createDelegateWallet(input: CreateDelegateWalletRequest): Promise<CreateDelegateWalletResponse> {
    return this.request<CreateDelegateWalletResponse>("/v1/thirdParty/user/generateWallet", {
      method: "POST",
      body: input,
      signed: true,
    });
  }

  private async request<T>(
    path: string,
    options: { method: "GET" | "POST"; body?: unknown; signed?: boolean; query?: Record<string, string> },
  ): Promise<T> {
    const query = options.query ? `?${new URLSearchParams(options.query).toString()}` : "";
    const url = `${this.baseUrl}${path}${query}`;
    for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(url, {
        method: options.method,
        headers: this.headers(path, options.method, options.body, options.signed),
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (response.ok) {
        return this.unwrapEnvelope<T>(path, await response.json());
      }

      if (!RETRYABLE_STATUS.has(response.status) || attempt === REQUEST_RETRIES) {
        throw new AppError({
          statusCode: response.status,
          code: "AVE_TRADING_REQUEST_FAILED",
          message: `AVE trading request failed for ${path}`,
          details: { status: response.status, body: await response.text() },
        });
      }

      this.logger.warn("AVE trading temporary failure, retrying", { path, status: response.status, attempt });
      await sleep(250 * (attempt + 1));
    }

    throw new AppError({ statusCode: 500, code: "AVE_TRADING_RETRY_EXHAUSTED", message: "AVE trading retries exhausted" });
  }

  private headers(path: string, method: "GET" | "POST", body: unknown, signed?: boolean): HeadersInit {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "AVE-ACCESS-KEY": this.apiKey,
    };
    if (!signed) {
      return baseHeaders;
    }
    if (!this.apiSecret) {
      throw new AppError({ statusCode: 500, code: "AVE_BOT_SECRET_MISSING", message: "AVE_BOT_API_SECRET is required for signed delegate calls." });
    }

    return { ...baseHeaders, ...createDelegateSignature(this.apiSecret, method, path, body) };
  }

  private unwrapEnvelope<T>(path: string, payload: unknown): T {
    const envelope = payload as AveTradingEnvelope<T>;
    if (envelope?.status !== undefined && !SUCCESS_CODES.has(envelope.status)) {
      throw new AppError({
        statusCode: 502,
        code: "AVE_TRADING_ENVELOPE_ERROR",
        message: envelope.msg ?? `AVE trading returned non-success status on ${path}`,
        details: { status: envelope.status, payload },
      });
    }

    if (envelope?.data !== undefined) {
      return envelope.data;
    }

    return payload as T;
  }
}
