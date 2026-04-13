import type { WatchlistToken } from "../monitoring/monitoring.types";

export interface IngestionLifecycle {
  start: () => Promise<void>;
  stop: () => void;
  runNow: () => Promise<void>;
}

export interface WatchlistBuildResult {
  tokens: WatchlistToken[];
  sourceCount: number;
}
