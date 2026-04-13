import type { MonitoringAlert, MonitoringSignal, MonitoringSnapshot } from "./monitoring.types";

const buildId = (parts: string[]): string => parts.join("-");

const severityToAlert = (severity: string): MonitoringAlert["severity"] => {
  if (severity === "critical") {
    return "critical";
  }

  if (severity === "high") {
    return "high";
  }

  if (severity === "warning") {
    return "warning";
  }

  if (severity === "opportunity") {
    return "opportunity";
  }

  return "info";
};

const toSignal = (
  snapshot: MonitoringSnapshot,
  module: "cabal" | "drain" | "conviction" | "narrative" | "dca",
): MonitoringSignal => {
  const moduleResult = snapshot.moduleScores[module];
  return {
    id: buildId([snapshot.chain, snapshot.tokenId, module, Date.now().toString()]),
    tokenId: snapshot.tokenId,
    chain: snapshot.chain,
    symbol: snapshot.symbol,
    module,
    score: moduleResult.score,
    severity: moduleResult.severity,
    summary: moduleResult.summary,
    metrics: moduleResult.metrics,
    createdAt: snapshot.updatedAt,
  };
};

const toAlert = (
  snapshot: MonitoringSnapshot,
  module: "cabal" | "drain" | "conviction" | "narrative" | "dca",
): MonitoringAlert => {
  const moduleResult = snapshot.moduleScores[module];
  return {
    id: buildId([snapshot.chain, snapshot.tokenId, module, "alert", Date.now().toString()]),
    tokenId: snapshot.tokenId,
    chain: snapshot.chain,
    severity: severityToAlert(moduleResult.severity),
    title: `${module.toUpperCase()} signal on ${snapshot.symbol}`,
    message: moduleResult.summary,
    createdAt: snapshot.updatedAt,
  };
};

export const buildSignalsFromSnapshot = (snapshot: MonitoringSnapshot): MonitoringSignal[] => {
  return ["cabal", "drain", "conviction", "narrative", "dca"].map((module) =>
    toSignal(snapshot, module as "cabal" | "drain" | "conviction" | "narrative" | "dca"),
  );
};

export const buildAlertsFromSnapshot = (snapshot: MonitoringSnapshot): MonitoringAlert[] => {
  return ["cabal", "drain", "conviction", "narrative", "dca"]
    .filter((module) => snapshot.moduleScores[module as "cabal" | "drain" | "conviction" | "narrative" | "dca"].score >= 45)
    .map((module) => toAlert(snapshot, module as "cabal" | "drain" | "conviction" | "narrative" | "dca"));
};
