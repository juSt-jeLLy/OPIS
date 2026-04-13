import { AppError } from "../../shared/errors/app-error";
import type { Logger } from "../../shared/logger/logger";
import type { AveTradingClient } from "../../shared/clients/ave-trading/ave-trading-client";
import type { QuoteRequest, SendSwapOrderRequest, SwapOrderStatus } from "../../shared/clients/ave-trading/ave-trading.types";
import { TradeActionsRepository } from "../persistence/trade-actions.repository";
import { TradeExecutionsRepository } from "../persistence/trade-executions.repository";
import type { MonitoringSnapshot, WatchlistToken } from "../monitoring/monitoring.types";
import { RiskGateService } from "./risk-gate.service";
import {
  ACTION_DEDUPE_WINDOW_MS,
  DEFAULT_AUTO_GAS,
  DEFAULT_BUY_AMOUNT_BY_CHAIN,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_USE_MEV,
  NATIVE_TOKEN_BY_CHAIN,
  ORDER_STATUS_MAX_POLLS,
  ORDER_STATUS_POLL_MS,
} from "./trading.constants";
import type { CreateActionInput, ExecuteSignalInput, ExecuteTradeInput, TradeAction, TradeExecution } from "./trading.types";

const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isTerminalStatus = (status: string): boolean => {
  return status === "confirmed" || status === "error" || status === "cancelled" || status === "auto_cancelled";
};

const tokenAddressFromTokenId = (tokenId: string): string => {
  const parts = tokenId.split("-");
  return parts.length > 1 ? parts.slice(0, -1).join("-") : tokenId;
};

const actionSwapType = (actionType: "buy" | "exit"): "buy" | "sell" => (actionType === "buy" ? "buy" : "sell");

export class TradingService {
  private readonly actionCooldownUntil = new Map<string, number>();

  public constructor(
    private readonly tradingClient: AveTradingClient,
    private readonly actionsRepository: TradeActionsRepository,
    private readonly tradesRepository: TradeExecutionsRepository,
    private readonly riskGate: RiskGateService,
    private readonly logger: Logger,
  ) {}

  /** Creates and auto-executes or queues actions for each user watching this token. */
  public async ingestSnapshot(snapshot: MonitoringSnapshot, watchlistsByUser: Record<string, WatchlistToken[]>): Promise<void> {
    const candidates = Object.entries(watchlistsByUser).flatMap(([userId, tokens]) => {
      return tokens.filter((token) => token.tokenId === snapshot.tokenId).map((token) => ({ userId, token }));
    });
    if (candidates.length === 0) {
      return;
    }

    const operations = candidates.map(({ userId, token }) => this.createActionFromSnapshot(snapshot, userId, token));
    await Promise.allSettled(operations);
  }

  public async quote(input: QuoteRequest): Promise<unknown> {
    return this.tradingClient.quote(input);
  }

  public async createOrder(input: ExecuteTradeInput): Promise<{ orderId: string; status?: SwapOrderStatus; trade: TradeExecution }> {
    const quote = await this.tradingClient.quote({
      chain: input.chain,
      inAmount: input.inAmount,
      inTokenAddress: input.inTokenAddress,
      outTokenAddress: input.outTokenAddress,
      swapType: input.swapType,
    });
    const payload: SendSwapOrderRequest = {
      chain: input.chain,
      assetsId: input.assetsId,
      inTokenAddress: input.inTokenAddress,
      outTokenAddress: input.outTokenAddress,
      inAmount: input.inAmount,
      swapType: input.swapType,
      slippage: input.slippageBps,
      useMev: input.useMev,
      autoGas: input.autoGas ?? DEFAULT_AUTO_GAS,
      autoSlippage: input.autoSlippage ?? true,
    };
    const order = await this.tradingClient.sendSwapOrder(payload);
    const trade = await this.tradesRepository.create({
      user_id: input.userId,
      action_id: input.actionId,
      token_id: input.tokenId,
      chain: input.chain,
      symbol: input.symbol,
      order_id: order.id,
      status: "generated",
      swap_type: input.swapType,
      in_token_address: input.inTokenAddress,
      out_token_address: input.outTokenAddress,
      in_amount: input.inAmount,
      quote_payload: quote as unknown as Record<string, unknown>,
      request_payload: payload as unknown as Record<string, unknown>,
    });
    const status = await this.pollOrderStatus(input.chain, order.id);
    return { orderId: order.id, status, trade };
  }

  public async getOrderStatus(chain: string, orderId: string): Promise<SwapOrderStatus | null> {
    const rows = await this.tradingClient.getSwapOrders(chain, [orderId]);
    return rows[0] ?? null;
  }

  public async listActions(userId: string, limit = 60): Promise<TradeAction[]> {
    return this.actionsRepository.listByUser(userId, limit);
  }

  public async listTrades(userId: string, limit = 60): Promise<TradeExecution[]> {
    return this.tradesRepository.listByUser(userId, limit);
  }

  public async dismissAction(userId: string, actionId: string): Promise<TradeAction> {
    const action = await this.requireUserAction(userId, actionId);
    const updated = await this.actionsRepository.updateStatus(action.id, "dismissed", action.metadata);
    if (!updated) {
      throw new AppError({ statusCode: 404, code: "ACTION_NOT_FOUND", message: "Action not found" });
    }
    return updated;
  }

  public async executeAction(
    userId: string,
    actionId: string,
    amountOverride?: string,
  ): Promise<{ action: TradeAction; orderId: string; status?: SwapOrderStatus }> {
    const action = await this.requireUserAction(userId, actionId);
    if (action.status !== "pending") {
      throw new AppError({ statusCode: 409, code: "ACTION_ALREADY_PROCESSED", message: "Action already processed." });
    }
    if (!action.assetsId) {
      throw new AppError({ statusCode: 400, code: "ASSETS_ID_REQUIRED", message: "assetsId is required to execute trades." });
    }
    const inAmount =
      amountOverride && action.executionMode === "trade" && amountOverride.trim().length > 0
        ? amountOverride.trim()
        : action.inAmount;
    const execution = await this.createOrder({
      actionId: action.id,
      userId: action.userId,
      tokenId: action.tokenId,
      chain: action.chain,
      symbol: action.symbol,
      assetsId: action.assetsId,
      inTokenAddress: action.inTokenAddress,
      outTokenAddress: action.outTokenAddress,
      inAmount,
      swapType: actionSwapType(action.actionType),
      slippageBps: DEFAULT_SLIPPAGE_BPS,
      useMev: DEFAULT_USE_MEV,
      autoGas: DEFAULT_AUTO_GAS,
      autoSlippage: true,
    });
    const actionStatus = execution.status && execution.status.status === "confirmed" ? "executed" : execution.status?.status === "error" ? "failed" : "executed";
    const updated = await this.actionsRepository.updateStatus(action.id, actionStatus, {
      ...action.metadata,
      orderId: execution.orderId,
      finalStatus: execution.status?.status,
      inAmount,
    });
    return { action: updated ?? action, orderId: execution.orderId, status: execution.status };
  }

  /** Creates an action directly from a signal card and executes it immediately. */
  public async executeSignal(input: ExecuteSignalInput): Promise<{ action: TradeAction; orderId: string; status?: SwapOrderStatus }> {
    const action = await this.actionsRepository.create(
      this.buildActionInputFromTokenConfig({
        userId: input.userId,
        tokenId: input.tokenId,
        chain: input.chain,
        symbol: input.symbol,
        actionType: input.actionType,
        reason: `Manual ${input.actionType} execution triggered from signal card.`,
        priority: 80,
        watchToken: input.watchToken,
        inAmountOverride: input.inAmount,
        executionModeOverride: input.executionMode,
        assetsIdOverride: input.assetsId,
      }),
    );
    const amountOverride =
      input.executionMode === "trade" || (!input.executionMode && input.watchToken?.executionMode !== "delegate_exit")
        ? input.inAmount
        : undefined;
    return this.executeAction(input.userId, action.id, amountOverride);
  }

  private async createActionFromSnapshot(snapshot: MonitoringSnapshot, userId: string, watchToken: WatchlistToken): Promise<void> {
    const decision = this.riskGate.evaluate(snapshot, watchToken);
    if (!decision?.shouldCreateAction) {
      return;
    }

    const dedupeKey = `${userId}:${snapshot.tokenId}:${decision.actionType}`;
    const cooldownUntil = this.actionCooldownUntil.get(dedupeKey) ?? 0;
    if (Date.now() < cooldownUntil) {
      return;
    }
    this.actionCooldownUntil.set(dedupeKey, Date.now() + ACTION_DEDUPE_WINDOW_MS);

    const action = await this.actionsRepository.create(this.buildActionInput(snapshot, watchToken, userId, decision.actionType, decision.reason, decision.priority));
    if (watchToken.executionMode === "delegate_exit" && decision.actionType === "exit" && action.assetsId) {
      await this.executeAction(userId, action.id).catch((error) => {
        this.logger.error("Auto delegate exit failed", { userId, tokenId: snapshot.tokenId, error: String(error) });
      });
    }
  }

  private buildActionInput(
    snapshot: MonitoringSnapshot,
    watchToken: WatchlistToken,
    userId: string,
    actionType: "buy" | "exit",
    reason: string,
    priority: number,
  ): CreateActionInput {
    return {
      ...this.buildActionInputFromTokenConfig({
        userId,
        tokenId: snapshot.tokenId,
        chain: snapshot.chain,
        symbol: snapshot.symbol,
        actionType,
        reason,
        priority,
        watchToken,
      }),
      metadata: { strategy: snapshot.strategy.mode, tos: snapshot.tos.score, polarity: snapshot.tos.polarity },
    };
  }

  private buildActionInputFromTokenConfig(input: {
    userId: string;
    tokenId: string;
    chain: MonitoringSnapshot["chain"];
    symbol: string;
    actionType: "buy" | "exit";
    reason: string;
    priority: number;
    watchToken?: WatchlistToken;
    inAmountOverride?: string;
    executionModeOverride?: WatchlistToken["executionMode"];
    assetsIdOverride?: string;
  }): CreateActionInput {
    const tokenAddress = input.watchToken?.tokenAddress ?? tokenAddressFromTokenId(input.tokenId);
    const nativeToken = NATIVE_TOKEN_BY_CHAIN[input.chain];
    const inTokenAddress = input.actionType === "buy" ? nativeToken : tokenAddress;
    const outTokenAddress = input.actionType === "buy" ? tokenAddress : nativeToken;
    const defaultAmount = DEFAULT_BUY_AMOUNT_BY_CHAIN[input.chain];
    const tokenAmount =
      input.actionType === "buy"
        ? input.watchToken?.buyAmountAtomic ?? defaultAmount
        : input.watchToken?.sellAmountAtomic ?? input.watchToken?.buyAmountAtomic ?? defaultAmount;
    const inAmount = input.inAmountOverride?.trim().length ? input.inAmountOverride.trim() : tokenAmount;
    const executionMode = input.executionModeOverride ?? input.watchToken?.executionMode ?? "trade";
    const assetsId = input.assetsIdOverride ?? input.watchToken?.assetsId;
    if (!assetsId) {
      throw new AppError({
        statusCode: 400,
        code: "ASSETS_ID_REQUIRED",
        message: "assetsId is required. Add token to watchlist and configure assetsId.",
      });
    }

    return {
      userId: input.userId,
      tokenId: input.tokenId,
      chain: input.chain,
      symbol: input.symbol,
      actionType: input.actionType,
      reason: input.reason,
      executionMode,
      inTokenAddress,
      outTokenAddress,
      inAmount,
      assetsId,
      priority: input.priority,
      metadata: { source: "manual_signal_execute" },
    };
  }

  private async pollOrderStatus(chain: string, orderId: string): Promise<SwapOrderStatus | undefined> {
    for (let attempt = 0; attempt < ORDER_STATUS_MAX_POLLS; attempt += 1) {
      const status = await this.getOrderStatus(chain, orderId);
      if (!status) {
        await sleep(ORDER_STATUS_POLL_MS);
        continue;
      }

      await this.tradesRepository.updateByOrderId(orderId, {
        status: status.status,
        out_amount: status.outAmount,
        tx_hash: status.txHash,
        tx_price_usd: status.txPriceUsd,
        error_message: status.errorMessage,
        status_payload: status as unknown as Record<string, unknown>,
      });
      if (isTerminalStatus(status.status)) {
        return status;
      }
      await sleep(ORDER_STATUS_POLL_MS);
    }
    return undefined;
  }

  private async requireUserAction(userId: string, actionId: string): Promise<TradeAction> {
    const action = await this.actionsRepository.findById(actionId);
    if (!action || action.userId !== userId) {
      throw new AppError({ statusCode: 404, code: "ACTION_NOT_FOUND", message: "Action not found" });
    }
    return action;
  }
}
