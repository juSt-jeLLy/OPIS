import type { MonitoringAlert, MonitoringSignal, MonitoringSnapshot } from "./monitoring.types";

const MODULES: Array<Exclude<MonitoringSignal["module"], "tos">> = [
  "cabal",
  "drain",
  "conviction",
  "narrative",
  "dca",
  "wash",
  "retention",
  "divergence",
];

const MODULE_ALERT_THRESHOLD: Record<Exclude<MonitoringSignal["module"], "tos">, number> = {
  cabal: 45,
  drain: 45,
  conviction: 50,
  narrative: 45,
  dca: 45,
  wash: 40,
  retention: 55,
  divergence: 45,
};

const buildId = (parts: string[]): string => parts.join("-");
const alertSeverity = (severity: MonitoringSignal["severity"]): MonitoringAlert["severity"] => severity;
const tosSeverity = (snapshot: MonitoringSnapshot): MonitoringSignal["severity"] => {
  if (snapshot.tos.zone === "act") {
    return snapshot.tos.polarity === "threat" ? "critical" : "opportunity";
  }

  if (snapshot.tos.zone === "watch") {
    return "warning";
  }

  return "info";
};

const toSignal = (snapshot: MonitoringSnapshot, module: Exclude<MonitoringSignal["module"], "tos">): MonitoringSignal => {
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

const toAlert = (snapshot: MonitoringSnapshot, module: Exclude<MonitoringSignal["module"], "tos">): MonitoringAlert => {
  const signal = toSignal(snapshot, module);
  return {
    id: buildId([snapshot.chain, snapshot.tokenId, module, "alert", Date.now().toString()]),
    tokenId: snapshot.tokenId,
    chain: snapshot.chain,
    severity: alertSeverity(signal.severity),
    title: `${module.toUpperCase()} signal on ${snapshot.symbol}`,
    message: signal.summary,
    createdAt: signal.createdAt,
  };
};

const toTosSignal = (snapshot: MonitoringSnapshot): MonitoringSignal => ({
  id: buildId([snapshot.chain, snapshot.tokenId, "tos", Date.now().toString()]),
  tokenId: snapshot.tokenId,
  chain: snapshot.chain,
  symbol: snapshot.symbol,
  module: "tos",
  score: snapshot.tos.score,
  severity: tosSeverity(snapshot),
  summary: `TOS ${snapshot.tos.score.toFixed(2)} (${snapshot.tos.zone}) with ${snapshot.tos.polarity} polarity.`,
  metrics: [
    { label: "Zone", value: snapshot.tos.zone },
    { label: "Polarity", value: snapshot.tos.polarity },
    { label: "Strategy", value: snapshot.strategy.mode },
    { label: "Confidence", value: snapshot.strategy.confidence.toFixed(2) },
  ],
  createdAt: snapshot.updatedAt,
});

const toTosAlert = (snapshot: MonitoringSnapshot): MonitoringAlert => {
  const signal = toTosSignal(snapshot);
  return {
    id: buildId([snapshot.chain, snapshot.tokenId, "tos", "alert", Date.now().toString()]),
    tokenId: snapshot.tokenId,
    chain: snapshot.chain,
    severity: alertSeverity(signal.severity),
    title: `TOS ${snapshot.tos.zone.toUpperCase()} on ${snapshot.symbol}`,
    message: `${signal.summary} ${snapshot.strategy.rationale}`,
    createdAt: signal.createdAt,
  };
};

export const buildSignalsFromSnapshot = (snapshot: MonitoringSnapshot): MonitoringSignal[] => {
  return [...MODULES.map((module) => toSignal(snapshot, module)), toTosSignal(snapshot)];
};

export const buildAlertsFromSnapshot = (snapshot: MonitoringSnapshot): MonitoringAlert[] => {
  const moduleAlerts = MODULES.filter((module) => snapshot.moduleScores[module].score >= MODULE_ALERT_THRESHOLD[module]).map((module) =>
    toAlert(snapshot, module),
  );
  if (snapshot.tos.score < 55) {
    return moduleAlerts;
  }

  return [...moduleAlerts, toTosAlert(snapshot)];
};
