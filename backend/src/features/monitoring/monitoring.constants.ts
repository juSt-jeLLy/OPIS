export const TOS_WEIGHTS = {
  cabal: 0.25,
  drain: 0.2,
  conviction: 0.25,
  narrative: 0.15,
  dca: 0.15,
} as const;

export const TOS_THRESHOLDS = {
  safe: 30,
  watch: 60,
} as const;

export const MODULE_THRESHOLDS = {
  cabalHighRiskScore: 65,
  cabalWatchScore: 45,
  convictionHighScore: 80,
  convictionOpportunityScore: 65,
  dcaOpportunityScore: 60,
} as const;

export const MAX_HOLDERS_FOR_CABAL_SCAN = 6;
export const MAX_SMART_WALLETS_FOR_CONVICTION_SCAN = 2;
export const MAX_SIGNALS_RETURNED = 50;
