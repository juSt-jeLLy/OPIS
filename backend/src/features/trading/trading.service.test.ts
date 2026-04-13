import { describe, expect, it, vi } from "vitest";
import type { AveTradingClient } from "../../shared/clients/ave-trading/ave-trading-client";
import type { MonitoringSnapshot, WatchlistToken } from "../monitoring/monitoring.types";
import { TradeActionsRepository } from "../persistence/trade-actions.repository";
import { TradeExecutionsRepository } from "../persistence/trade-executions.repository";
import { RiskGateService } from "./risk-gate.service";
import { TradingService } from "./trading.service";

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const snapshot: MonitoringSnapshot = {
  tokenId: "0xabc-bsc",
  chain: "bsc",
  symbol: "ABC",
  name: "ABC",
  strategy: { mode: "DEFENSIVE_EXIT", confidence: 91, rationale: "threat" },
  tos: {
    score: 84,
    zone: "act",
    polarity: "threat",
    breakdown: { cabal: 40, drain: 30, conviction: 5, narrative: 5, dca: 4 },
  },
  moduleScores: {
    cabal: { score: 40, severity: "high", summary: "high risk", metrics: [] },
    drain: { score: 30, severity: "high", summary: "drain", metrics: [] },
    conviction: { score: 5, severity: "info", summary: "low", metrics: [] },
    narrative: { score: 5, severity: "info", summary: "low", metrics: [] },
    dca: { score: 4, severity: "info", summary: "low", metrics: [] },
  },
  updatedAt: new Date().toISOString(),
};

const watchToken: WatchlistToken = {
  tokenId: "0xabc-bsc",
  chain: "bsc",
  tokenAddress: "0xabc",
  symbol: "ABC",
  executionMode: "delegate_exit",
  assetsId: "asset-1",
  sellAmountAtomic: "1000",
};

describe("TradingService", () => {
  it("creates and auto-executes delegate exit action on threat snapshots", async () => {
    const actionsRepository = {
      create: vi.fn().mockResolvedValue({
        id: "action-1",
        userId: "user-1",
        tokenId: snapshot.tokenId,
        chain: snapshot.chain,
        symbol: snapshot.symbol,
        actionType: "exit",
        status: "pending",
        reason: "reason",
        executionMode: "delegate_exit",
        inTokenAddress: "0xabc",
        outTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        inAmount: "1000",
        assetsId: "asset-1",
        priority: 84,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      findById: vi.fn().mockResolvedValue({
        id: "action-1",
        userId: "user-1",
        tokenId: snapshot.tokenId,
        chain: snapshot.chain,
        symbol: snapshot.symbol,
        actionType: "exit",
        status: "pending",
        reason: "reason",
        executionMode: "delegate_exit",
        inTokenAddress: "0xabc",
        outTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        inAmount: "1000",
        assetsId: "asset-1",
        priority: 84,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      updateStatus: vi.fn().mockResolvedValue({
        id: "action-1",
        userId: "user-1",
        tokenId: snapshot.tokenId,
        chain: snapshot.chain,
        symbol: snapshot.symbol,
        actionType: "exit",
        status: "executed",
        reason: "reason",
        executionMode: "delegate_exit",
        inTokenAddress: "0xabc",
        outTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        inAmount: "1000",
        assetsId: "asset-1",
        priority: 84,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      listByUser: vi.fn().mockResolvedValue([]),
    } as unknown as TradeActionsRepository;

    const tradesRepository = {
      create: vi.fn().mockResolvedValue({
        id: "trade-1",
        userId: "user-1",
        tokenId: snapshot.tokenId,
        chain: snapshot.chain,
        symbol: snapshot.symbol,
        orderId: "order-1",
        status: "generated",
        swapType: "sell",
        inTokenAddress: "0xabc",
        outTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        inAmount: "1000",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      updateByOrderId: vi.fn().mockResolvedValue(null),
      listByUser: vi.fn().mockResolvedValue([]),
    } as unknown as TradeExecutionsRepository;

    const tradingClient = {
      quote: vi.fn().mockResolvedValue({ estimateOut: "900", decimals: 18 }),
      sendSwapOrder: vi.fn().mockResolvedValue({ id: "order-1" }),
      getSwapOrders: vi.fn().mockResolvedValue([{ id: "order-1", status: "confirmed", chain: "bsc", swapType: "sell" }]),
    } as unknown as AveTradingClient;

    const service = new TradingService(tradingClient, actionsRepository, tradesRepository, new RiskGateService(), logger);

    await service.ingestSnapshot(snapshot, { "user-1": [watchToken] });

    expect((actionsRepository.create as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((tradingClient.sendSwapOrder as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((actionsRepository.updateStatus as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });
});

