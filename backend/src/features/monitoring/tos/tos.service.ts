import { TOS_THRESHOLDS, TOS_WEIGHTS } from "../monitoring.constants";
import type { ModuleResult, TosResult } from "../monitoring.types";

const toZone = (score: number): TosResult["zone"] => {
  if (score < TOS_THRESHOLDS.safe) {
    return "safe";
  }

  if (score < TOS_THRESHOLDS.watch) {
    return "watch";
  }

  return "act";
};

const toPolarity = (modules: { cabal: ModuleResult; drain: ModuleResult; conviction: ModuleResult; narrative: ModuleResult; dca: ModuleResult }): TosResult["polarity"] => {
  const threatScore = modules.cabal.score + modules.drain.score;
  const opportunityScore = modules.conviction.score + modules.narrative.score + modules.dca.score;
  return threatScore >= opportunityScore ? "threat" : "opportunity";
};

export class TosService {
  public compose(modules: { cabal: ModuleResult; drain: ModuleResult; conviction: ModuleResult; narrative: ModuleResult; dca: ModuleResult }): TosResult {
    const score =
      modules.cabal.score * TOS_WEIGHTS.cabal +
      modules.drain.score * TOS_WEIGHTS.drain +
      modules.conviction.score * TOS_WEIGHTS.conviction +
      modules.narrative.score * TOS_WEIGHTS.narrative +
      modules.dca.score * TOS_WEIGHTS.dca;

    return {
      score: Number(score.toFixed(2)),
      zone: toZone(score),
      polarity: toPolarity(modules),
      breakdown: {
        cabal: modules.cabal.score,
        drain: modules.drain.score,
        conviction: modules.conviction.score,
        narrative: modules.narrative.score,
        dca: modules.dca.score,
      },
    };
  }
}
