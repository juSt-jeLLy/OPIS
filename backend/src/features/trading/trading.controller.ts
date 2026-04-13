import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error";
import { resolveUserId } from "../../shared/http/user-id";
import type { SupportedChain } from "../../shared/constants/chains.constants";
import { DEFAULT_AUTO_GAS, DEFAULT_SLIPPAGE_BPS, DEFAULT_USE_MEV } from "./trading.constants";
import type { TradingService } from "./trading.service";
import type { MonitoringService } from "../monitoring/monitoring.service";

const parseChain = (value: unknown): SupportedChain => {
  const chain = String(value ?? "").toLowerCase();
  if (chain === "solana" || chain === "bsc" || chain === "eth" || chain === "base") {
    return chain;
  }
  throw new AppError({ statusCode: 400, code: "INVALID_CHAIN", message: `Unsupported chain: ${chain}` });
};

const parseLimit = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 200)) : fallback;
};

const requiredString = (value: unknown, field: string): string => {
  const next = typeof value === "string" ? value.trim() : "";
  if (next.length === 0) {
    throw new AppError({ statusCode: 400, code: `${field.toUpperCase()}_REQUIRED`, message: `${field} is required` });
  }

  return next;
};

export class TradingController {
  public constructor(
    private readonly service: TradingService,
    private readonly monitoringService: MonitoringService,
    private readonly defaultUserId: string,
  ) {}

  public async quote(request: Request, response: Response): Promise<void> {
    const result = await this.service.quote({
      chain: parseChain(request.body?.chain),
      inAmount: requiredString(request.body?.inAmount, "inAmount"),
      inTokenAddress: requiredString(request.body?.inTokenAddress, "inTokenAddress"),
      outTokenAddress: requiredString(request.body?.outTokenAddress, "outTokenAddress"),
      swapType: request.body?.swapType === "sell" ? "sell" : "buy",
    });
    response.json({ quote: result });
  }

  public async createOrder(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    const result = await this.service.createOrder({
      userId,
      actionId: typeof request.body?.actionId === "string" ? request.body.actionId : undefined,
      tokenId: requiredString(request.body?.tokenId, "tokenId"),
      chain: parseChain(request.body?.chain),
      symbol: requiredString(request.body?.symbol, "symbol"),
      assetsId: requiredString(request.body?.assetsId, "assetsId"),
      inTokenAddress: requiredString(request.body?.inTokenAddress, "inTokenAddress"),
      outTokenAddress: requiredString(request.body?.outTokenAddress, "outTokenAddress"),
      inAmount: requiredString(request.body?.inAmount, "inAmount"),
      swapType: request.body?.swapType === "sell" ? "sell" : "buy",
      slippageBps: typeof request.body?.slippageBps === "string" ? request.body.slippageBps : DEFAULT_SLIPPAGE_BPS,
      useMev: typeof request.body?.useMev === "boolean" ? request.body.useMev : DEFAULT_USE_MEV,
      autoGas: request.body?.autoGas === "low" || request.body?.autoGas === "high" ? request.body.autoGas : DEFAULT_AUTO_GAS,
      autoSlippage: typeof request.body?.autoSlippage === "boolean" ? request.body.autoSlippage : true,
    });
    response.status(202).json(result);
  }

  public async getOrderStatus(request: Request, response: Response): Promise<void> {
    const orderId = requiredString(request.params.orderId, "orderId");
    const chain = parseChain(request.query.chain);
    const status = await this.service.getOrderStatus(chain, orderId);
    response.json({ status });
  }

  public async listActions(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    response.json({ actions: await this.service.listActions(userId, parseLimit(request.query.limit, 60)) });
  }

  public async executeAction(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    const actionId = requiredString(request.params.actionId, "actionId");
    const amountOverride = typeof request.body?.inAmount === "string" ? request.body.inAmount : undefined;
    response.status(202).json(await this.service.executeAction(userId, actionId, amountOverride));
  }

  public async executeSignal(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    const chain = parseChain(request.body?.chain);
    const tokenId = requiredString(request.body?.tokenId, "tokenId");
    const symbol = requiredString(request.body?.symbol, "symbol");
    const actionType = request.body?.actionType === "exit" ? "exit" : "buy";
    const watchToken = this.monitoringService
      .getUserWatchlist(userId)
      .find((token) => token.tokenId === tokenId);
    const executionMode = request.body?.executionMode === "delegate_exit" ? "delegate_exit" : request.body?.executionMode === "trade" ? "trade" : undefined;

    const result = await this.service.executeSignal({
      userId,
      tokenId,
      chain,
      symbol,
      actionType,
      inAmount: typeof request.body?.inAmount === "string" ? request.body.inAmount : undefined,
      assetsId: typeof request.body?.assetsId === "string" ? request.body.assetsId : undefined,
      executionMode,
      watchToken,
    });

    response.status(202).json(result);
  }

  public async dismissAction(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    const actionId = requiredString(request.params.actionId, "actionId");
    response.status(202).json({ action: await this.service.dismissAction(userId, actionId) });
  }

  public async listTrades(request: Request, response: Response): Promise<void> {
    const userId = resolveUserId(request, this.defaultUserId);
    response.json({ trades: await this.service.listTrades(userId, parseLimit(request.query.limit, 80)) });
  }
}
