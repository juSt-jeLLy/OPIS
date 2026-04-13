import type {
  MonitoringAlert,
  MonitoringSignal,
  MonitoringSnapshot,
  NarrativeSnapshot,
  WatchlistToken,
} from "./monitoring.types";

const MAX_STORED_SIGNALS = 500;
const MAX_STORED_ALERTS = 500;

const narrativeKey = (chain: string, narrative: string): string => `${chain}:${narrative}`;
const watchlistKey = (token: WatchlistToken): string => `${token.chain}:${token.tokenId}`;

const dedupeWatchlist = (tokens: WatchlistToken[]): WatchlistToken[] => {
  const deduped = new Map<string, WatchlistToken>();
  tokens.forEach((token) => {
    deduped.set(watchlistKey(token), token);
  });
  return [...deduped.values()];
};

const mergeWatchlists = (userWatchlist: WatchlistToken[], systemWatchlist: WatchlistToken[]): WatchlistToken[] => {
  const merged = new Map<string, WatchlistToken>();
  userWatchlist.forEach((token) => merged.set(watchlistKey(token), token));
  systemWatchlist.forEach((token) => {
    if (!merged.has(watchlistKey(token))) {
      merged.set(watchlistKey(token), token);
    }
  });
  return [...merged.values()];
};

export class MonitoringRepository {
  private readonly snapshots = new Map<string, MonitoringSnapshot>();
  private readonly signals: MonitoringSignal[] = [];
  private readonly alerts: MonitoringAlert[] = [];
  private readonly narrativeHistory = new Map<string, NarrativeSnapshot[]>();
  private systemWatchlist: WatchlistToken[] = [];
  private userWatchlist: WatchlistToken[] = [];

  public upsertSnapshot(snapshot: MonitoringSnapshot): void {
    this.snapshots.set(`${snapshot.chain}:${snapshot.tokenId}`, snapshot);
  }

  public listSnapshots(): MonitoringSnapshot[] {
    return [...this.snapshots.values()];
  }

  public addSignals(signals: MonitoringSignal[]): void {
    this.signals.unshift(...signals);
    this.signals.splice(MAX_STORED_SIGNALS);
  }

  public listSignals(limit: number): MonitoringSignal[] {
    return this.signals.slice(0, limit);
  }

  public addAlerts(alerts: MonitoringAlert[]): void {
    this.alerts.unshift(...alerts);
    this.alerts.splice(MAX_STORED_ALERTS);
  }

  public listAlerts(limit: number): MonitoringAlert[] {
    return this.alerts.slice(0, limit);
  }

  public setSystemWatchlist(tokens: WatchlistToken[]): void {
    this.systemWatchlist = dedupeWatchlist(tokens);
  }

  public replaceUserWatchlist(tokens: WatchlistToken[]): void {
    this.userWatchlist = dedupeWatchlist(tokens);
  }

  public getSystemWatchlist(): WatchlistToken[] {
    return this.systemWatchlist;
  }

  public getUserWatchlist(): WatchlistToken[] {
    return this.userWatchlist;
  }

  public getWatchlist(): WatchlistToken[] {
    return mergeWatchlists(this.userWatchlist, this.systemWatchlist);
  }

  public saveNarrativeSnapshots(snapshots: NarrativeSnapshot[]): void {
    snapshots.forEach((snapshot) => {
      const key = narrativeKey(snapshot.chain, snapshot.narrative);
      const current = this.narrativeHistory.get(key) ?? [];
      const next = [snapshot, ...current].slice(0, 2);
      this.narrativeHistory.set(key, next);
    });
  }

  public getPreviousNarrativeSnapshot(chain: string, narrative: string): NarrativeSnapshot | undefined {
    const history = this.narrativeHistory.get(narrativeKey(chain, narrative)) ?? [];
    return history[1];
  }
}
