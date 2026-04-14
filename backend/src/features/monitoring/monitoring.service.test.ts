import { describe, expect, it, vi } from "vitest";
import type { AveDataClient } from "../../shared/clients/ave/ave-client";
import type { CabalModuleService } from "./modules/cabal/cabal.service";
import type { ConvictionModuleService } from "./modules/conviction/conviction.service";
import type { DcaModuleService } from "./modules/dca/dca.service";
import type { DevDrainModuleService } from "./modules/dev-drain/dev-drain.service";
import type { NarrativeModuleService } from "./modules/narrative/narrative.service";
import type { WashModuleService } from "./modules/wash/wash.service";
import type { RetentionModuleService } from "./modules/retention/retention.service";
import type { DivergenceModuleService } from "./modules/divergence/divergence.service";
import { MonitoringRepository } from "./monitoring.repository";
import { MonitoringService } from "./monitoring.service";
import { TosService } from "./tos/tos.service";

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const moduleResult = {
  score: 70,
  severity: "high" as const,
  summary: "Signal triggered",
  metrics: [],
};

describe("MonitoringService", () => {
  it("broadcasts snapshots with user watchlist context and pins user signals", async () => {
    const client = {
      getTokenDetails: vi.fn().mockImplementation(async (tokenId: string) => ({
        token: tokenId.split("-")[0],
        chain: "bsc",
        symbol: tokenId.startsWith("0xuser") ? "USER" : "SYS",
        name: "Token",
        main_pair: "pair",
        main_pair_tvl: 100000,
        created_at: Date.now(),
      })),
      getContracts: vi.fn().mockResolvedValue({
        id: "c",
        token: "t",
        chain: "bsc",
        creator_address: "0xcreator",
        analysis_risk_score: 40,
      }),
    } as unknown as AveDataClient;

    const repository = new MonitoringRepository();
    const service = new MonitoringService(
      client,
      repository,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as CabalModuleService,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as DevDrainModuleService,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as ConvictionModuleService,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as DcaModuleService,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as NarrativeModuleService,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as WashModuleService,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as RetentionModuleService,
      { evaluate: vi.fn().mockResolvedValue(moduleResult) } as unknown as DivergenceModuleService,
      new TosService(),
      logger,
    );

    service.replaceUserWatchlist("user-1", [
      { tokenId: "0xuser-bsc", chain: "bsc", tokenAddress: "0xuser", symbol: "USER" },
    ]);
    const snapshotListener = vi.fn();
    service.subscribeSnapshots(snapshotListener);

    await service.analyzeToken({ tokenId: "0xuser-bsc", chain: "bsc", tokenAddress: "0xuser", symbol: "USER" });
    await service.analyzeToken({ tokenId: "0xsys-bsc", chain: "bsc", tokenAddress: "0xsys", symbol: "SYS" });

    expect(snapshotListener).toHaveBeenCalled();
    expect(snapshotListener.mock.calls[0][1]).toHaveProperty("user-1");

    const signals = service.getSignals(10, "user-1");
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].tokenId).toBe("0xuser-bsc");
  });
});
