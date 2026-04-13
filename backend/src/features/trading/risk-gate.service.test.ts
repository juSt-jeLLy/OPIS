import { describe, expect, it } from "vitest";
import { RiskGateService } from "./risk-gate.service";
import type { MonitoringSnapshot, WatchlistToken } from "../monitoring/monitoring.types";

const watchToken: WatchlistToken = {
  tokenId: "0xabc-bsc",
  chain: "bsc",
  tokenAddress: "0xabc",
  symbol: "ABC",
};

const snapshotBase: MonitoringSnapshot = {
  tokenId: "0xabc-bsc",
  chain: "bsc",
  symbol: "ABC",
  name: "ABC",
  strategy: { mode: "MONITOR", confidence: 30, rationale: "monitor" },
  tos: {
    score: 30,
    zone: "watch",
    polarity: "threat",
    breakdown: { cabal: 10, drain: 10, conviction: 5, narrative: 3, dca: 2 },
  },
  moduleScores: {
    cabal: { score: 10, severity: "info", summary: "ok", metrics: [] },
    drain: { score: 10, severity: "info", summary: "ok", metrics: [] },
    conviction: { score: 5, severity: "info", summary: "ok", metrics: [] },
    narrative: { score: 3, severity: "info", summary: "ok", metrics: [] },
    dca: { score: 2, severity: "info", summary: "ok", metrics: [] },
  },
  updatedAt: new Date().toISOString(),
};

describe("RiskGateService", () => {
  it("creates exit decision for threat snapshot above threshold", () => {
    const service = new RiskGateService();
    const decision = service.evaluate(
      {
        ...snapshotBase,
        strategy: { mode: "DEFENSIVE_EXIT", confidence: 88, rationale: "threat" },
        tos: { ...snapshotBase.tos, score: 78, polarity: "threat", zone: "act" },
      },
      watchToken,
    );

    expect(decision?.actionType).toBe("exit");
    expect(decision?.shouldCreateAction).toBe(true);
  });

  it("creates buy decision for opportunity snapshot above threshold", () => {
    const service = new RiskGateService();
    const decision = service.evaluate(
      {
        ...snapshotBase,
        strategy: { mode: "OPPORTUNITY_ENTRY", confidence: 74, rationale: "opportunity" },
        tos: { ...snapshotBase.tos, score: 71, polarity: "opportunity", zone: "act" },
      },
      watchToken,
    );

    expect(decision?.actionType).toBe("buy");
    expect(decision?.priority).toBeGreaterThan(60);
  });

  it("returns null when snapshot is below thresholds", () => {
    const service = new RiskGateService();
    const decision = service.evaluate(snapshotBase, watchToken);
    expect(decision).toBeNull();
  });
});

