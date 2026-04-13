import type { MonitoringSnapshot, WatchlistToken } from "../monitoring/monitoring.types";
import { OPPORTUNITY_BUY_TRIGGER, THREAT_EXIT_TRIGGER } from "./trading.constants";
import type { TradeActionType } from "./trading.types";

export interface RiskGateDecision {
  shouldCreateAction: boolean;
  actionType: TradeActionType;
  reason: string;
  priority: number;
}

const parseScore = (value: number): number => {
  return Number.isFinite(value) ? value : 0;
};

export class RiskGateService {
  /** Converts live monitoring snapshots into executable buy/exit action decisions. */
  public evaluate(snapshot: MonitoringSnapshot, watchToken: WatchlistToken): RiskGateDecision | null {
    const score = parseScore(snapshot.tos.score);
    const isThreat = snapshot.tos.polarity === "threat" || snapshot.strategy.mode === "DEFENSIVE_EXIT";
    const isOpportunity =
      snapshot.strategy.mode === "OPPORTUNITY_ENTRY" || snapshot.strategy.mode === "DCA_ACCUMULATION" || snapshot.tos.polarity === "opportunity";

    if (isThreat && score >= THREAT_EXIT_TRIGGER) {
      return {
        shouldCreateAction: true,
        actionType: "exit",
        reason: `Threat gate triggered at TOS ${score.toFixed(2)} (${snapshot.strategy.rationale})`,
        priority: Math.min(100, Math.round(score)),
      };
    }

    if (isOpportunity && score >= OPPORTUNITY_BUY_TRIGGER) {
      return {
        shouldCreateAction: true,
        actionType: "buy",
        reason: `Opportunity gate triggered at TOS ${score.toFixed(2)} (${snapshot.strategy.rationale})`,
        priority: Math.min(100, Math.round(score)),
      };
    }

    return null;
  }
}

