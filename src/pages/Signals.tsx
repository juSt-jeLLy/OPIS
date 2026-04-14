import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  Clock3,
  Eye,
  Globe,
  Network,
  Play,
  Repeat,
  Shield,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import ParticleBackground from "@/components/ParticleBackground";
import GlowingCard from "@/components/GlowingCard";
import { useMonitoringSignals } from "@/features/monitoring/hooks/use-monitoring-signals";
import { useMonitoringWatchlist } from "@/features/monitoring/hooks/use-monitoring-watchlist";
import { useMonitoringOverview } from "@/features/monitoring/hooks/use-monitoring-overview";
import { useMonitoringLiveStream } from "@/features/monitoring/hooks/use-monitoring-live-stream";
import type { MonitoringSignal, MonitoringSnapshot } from "@/features/monitoring/monitoring.types";
import {
  useDismissTradingAction,
  useExecuteTradingAction,
  useExecuteSignalTrade,
  useTradingActions,
} from "@/features/trading/hooks/use-trading-actions";
import type { TradeAction } from "@/features/trading/trading.types";

type SignalCategory = "threat" | "opportunity";
type CategoryFilter = "all" | "my" | SignalCategory;
type SortMode = "priority" | "score" | "latest";
type ModuleFilter = "all" | MonitoringSignal["module"];

const SYSTEM_SIGNAL_LIMIT = 24;
const severityPriority: Record<MonitoringSignal["severity"], number> = {
  critical: 5,
  high: 4,
  warning: 3,
  opportunity: 2,
  info: 1,
};

const severityStyles: Record<MonitoringSignal["severity"], string> = {
  critical: "border-red-500/30 bg-red-500/5",
  high: "border-orange-400/30 bg-orange-400/5",
  warning: "border-yellow-400/30 bg-yellow-400/5",
  opportunity: "border-emerald-400/30 bg-emerald-400/5",
  info: "border-primary/30 bg-primary/5",
};

const severityBadge: Record<MonitoringSignal["severity"], string> = {
  critical: "bg-red-500/10 text-red-400",
  high: "bg-orange-400/10 text-orange-400",
  warning: "bg-yellow-400/10 text-yellow-400",
  opportunity: "bg-emerald-400/10 text-emerald-400",
  info: "bg-primary/10 text-primary",
};

const moduleMeta: Record<
  MonitoringSignal["module"],
  { icon: LucideIcon; label: string; group: "core" | "advanced" | "composite"; category?: SignalCategory }
> = {
  tos: { icon: Sparkles, label: "TOS Composite", group: "composite" },
  cabal: { icon: Eye, label: "Cabal Fingerprinter", group: "core", category: "threat" },
  drain: { icon: Shield, label: "DEV Drain Velocity", group: "core", category: "threat" },
  conviction: { icon: Brain, label: "Conviction Stack", group: "core", category: "opportunity" },
  narrative: { icon: Globe, label: "Narrative Radar", group: "core", category: "opportunity" },
  dca: { icon: Repeat, label: "DCA Accumulation", group: "core", category: "opportunity" },
  wash: { icon: Waves, label: "Wash Detector", group: "advanced", category: "threat" },
  retention: { icon: Clock3, label: "Retention Tracker", group: "advanced", category: "opportunity" },
  divergence: { icon: TrendingUp, label: "Momentum Divergence", group: "advanced", category: "threat" },
};
const fallbackModuleMeta: { icon: LucideIcon; label: string; group: "advanced"; category: SignalCategory } = {
  icon: Activity,
  label: "Signal Module",
  group: "advanced",
  category: "threat",
};

const moduleFilters: Array<{ key: ModuleFilter; label: string; icon: LucideIcon }> = [
  { key: "all", label: "All", icon: Activity },
  { key: "tos", label: "TOS", icon: Sparkles },
  { key: "cabal", label: "Cabal", icon: Eye },
  { key: "drain", label: "Drain", icon: Shield },
  { key: "wash", label: "Wash", icon: Waves },
  { key: "divergence", label: "Divergence", icon: TrendingUp },
  { key: "conviction", label: "Conviction", icon: Brain },
  { key: "narrative", label: "Narrative", icon: Globe },
  { key: "dca", label: "DCA", icon: Repeat },
  { key: "retention", label: "Retention", icon: Clock3 },
];

const resolveSignalCategory = (signal: MonitoringSignal): SignalCategory => {
  if (signal.module === "tos") {
    return signal.severity === "opportunity" ? "opportunity" : "threat";
  }

  return moduleMeta[signal.module]?.category ?? (signal.severity === "opportunity" ? "opportunity" : "threat");
};

const safeScore = (value: unknown): string => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
};

const scoreTiles = (snapshot: MonitoringSnapshot) => [
  { label: "TOS", value: safeScore(snapshot.tos?.score) },
  { label: "CABAL", value: safeScore(snapshot.moduleScores?.cabal?.score) },
  { label: "DRAIN", value: safeScore(snapshot.moduleScores?.drain?.score) },
  { label: "CONV", value: safeScore(snapshot.moduleScores?.conviction?.score) },
  { label: "NARR", value: safeScore(snapshot.moduleScores?.narrative?.score) },
  { label: "DCA", value: safeScore(snapshot.moduleScores?.dca?.score) },
  { label: "WASH", value: safeScore(snapshot.moduleScores?.wash?.score) },
  { label: "RET", value: safeScore(snapshot.moduleScores?.retention?.score) },
  { label: "DIV", value: safeScore(snapshot.moduleScores?.divergence?.score) },
];

const Signals = () => {
  useMonitoringLiveStream();

  const { data, isLoading, isFetching } = useMonitoringSignals();
  const { data: overview } = useMonitoringOverview();
  const { data: watchlistData } = useMonitoringWatchlist();
  const { data: actionsData } = useTradingActions();
  const executeAction = useExecuteTradingAction();
  const executeSignalTrade = useExecuteSignalTrade();
  const dismissAction = useDismissTradingAction();

  const [amountByActionId, setAmountByActionId] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<MonitoringSignal["severity"] | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  const userTokenIdSet = useMemo(
    () => new Set((watchlistData?.userWatchlist ?? []).map((token) => token.tokenId)),
    [watchlistData?.userWatchlist],
  );
  const userWatchlistByTokenId = useMemo(
    () => new Map((watchlistData?.userWatchlist ?? []).map((token) => [token.tokenId, token])),
    [watchlistData?.userWatchlist],
  );
  const alerts = overview?.alerts ?? [];
  const snapshotByTokenId = useMemo(
    () => new Map((overview?.snapshots ?? []).map((snapshot) => [snapshot.tokenId, snapshot])),
    [overview?.snapshots],
  );

  const pendingActionByTokenAndType = useMemo(() => {
    const mapped = new Map<string, TradeAction>();
    (actionsData?.actions ?? [])
      .filter((action) => action.status === "pending")
      .forEach((action) => mapped.set(`${action.tokenId}:${action.actionType}`, action));
    return mapped;
  }, [actionsData?.actions]);

  const alertsByToken = useMemo(() => {
    const mapped = new Map<string, typeof alerts>();
    alerts.forEach((alert) => {
      const current = mapped.get(alert.tokenId) ?? [];
      mapped.set(alert.tokenId, [...current, alert]);
    });
    return mapped;
  }, [alerts]);

  const signals = useMemo(() => {
    const deduped = new Map<string, MonitoringSignal>();
    (data?.signals ?? []).forEach((signal) => {
      const key = `${signal.tokenId}:${signal.module}`;
      if (!deduped.has(key)) {
        deduped.set(key, signal);
      }
    });

    const base = [...deduped.values()].map((signal) => ({
      ...signal,
      moduleCategory: resolveSignalCategory(signal),
      isUserWatchlist: userTokenIdSet.has(signal.tokenId),
    }));

    const filtered = base.filter((signal) => {
      if (moduleFilter !== "all" && signal.module !== moduleFilter) {
        return false;
      }

      if (priorityFilter !== "all" && signal.severity !== priorityFilter) {
        return false;
      }

      if (categoryFilter === "my" && !signal.isUserWatchlist) {
        return false;
      }

      if ((categoryFilter === "threat" || categoryFilter === "opportunity") && signal.moduleCategory !== categoryFilter) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (left.isUserWatchlist !== right.isUserWatchlist) {
        return left.isUserWatchlist ? -1 : 1;
      }

      if (sortMode === "score") {
        return right.score - left.score;
      }

      if (sortMode === "latest") {
        return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      }

      const priorityDiff = severityPriority[right.severity] - severityPriority[left.severity];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.score - left.score;
    });

    if (categoryFilter === "my") {
      return sorted;
    }

    const pinned = sorted.filter((signal) => signal.isUserWatchlist);
    const system = sorted.filter((signal) => !signal.isUserWatchlist).slice(0, SYSTEM_SIGNAL_LIMIT);
    return [...pinned, ...system];
  }, [data?.signals, userTokenIdSet, moduleFilter, priorityFilter, categoryFilter, sortMode]);

  const stats = useMemo(() => {
    const tosActionSignals = signals.filter((signal) => signal.module === "tos" && signal.score >= 60).length;
    return {
      total: signals.length,
      pinned: signals.filter((signal) => signal.isUserWatchlist).length,
      threat: signals.filter((signal) => signal.moduleCategory === "threat").length,
      tosActionSignals,
    };
  }, [signals]);

  const handleExecuteFromSignal = async (actionId: string, inAmount?: string) => {
    try {
      await executeAction.mutateAsync({ actionId, inAmount });
      toast.success("Order submitted to AVE Trading Skill.");
    } catch {
      toast.error("Trade execution failed. Check assetsId/permissions for this token.");
    }
  };

  const handleDismiss = async (actionId: string) => {
    try {
      await dismissAction.mutateAsync(actionId);
      toast.success("Action dismissed.");
    } catch {
      toast.error("Unable to dismiss action.");
    }
  };

  const handleExecuteSignalInstant = async (input: {
    tokenId: string;
    chain: MonitoringSignal["chain"];
    symbol: string;
    actionType: "buy" | "exit";
    inAmount?: string;
    executionMode: "trade" | "delegate_exit";
  }) => {
    const config = userWatchlistByTokenId.get(input.tokenId);
    const assetsId = config?.assetsId?.trim();
    if (!assetsId) {
      toast.error("Set this token's delegate wallet assetsId in Dashboard watchlist settings first.");
      return;
    }

    try {
      await executeSignalTrade.mutateAsync({
        tokenId: input.tokenId,
        chain: input.chain,
        symbol: input.symbol,
        actionType: input.actionType,
        inAmount: input.executionMode === "trade" ? input.inAmount : undefined,
        assetsId,
        executionMode: input.executionMode,
      });
      toast.success(`${input.actionType === "buy" ? "Buy" : "Sell"} order submitted.`);
    } catch {
      toast.error("Execution failed. Check assetsId, amount, and delegate wallet status.");
    }
  };

  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient-primary">Signal</span> Intelligence
          </h1>
          <p className="text-muted-foreground">WSS-live monitoring feed with TOS composite, 5 core quant models, and 3 advanced monitors.</p>
        </div>

        <GlowingCard className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border/60 bg-background/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Signals In View</p>
              <p className="text-2xl font-mono text-foreground">{stats.total}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Pinned Watchlist</p>
              <p className="text-2xl font-mono text-primary">{stats.pinned}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Threat Signals</p>
              <p className="text-2xl font-mono text-red-400">{stats.threat}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/30 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">TOS Action Zone</p>
              <p className="text-2xl font-mono text-yellow-400">{stats.tosActionSignals}</p>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-sm font-semibold text-foreground">Pinned Watchlist Tokens</h2>
            <span className="text-xs font-mono text-primary">{isFetching ? "SYNCING" : "LIVE"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(watchlistData?.userWatchlist ?? []).map((token) => (
              <div key={token.tokenId} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary font-mono">
                {token.symbol ?? token.tokenId} · {token.chain.toUpperCase()}
              </div>
            ))}
            {(watchlistData?.userWatchlist ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No pinned tokens yet. Add them in Dashboard watchlist.</p>
            )}
          </div>
        </GlowingCard>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
            <option value="all">All Categories</option>
            <option value="my">My Watchlist</option>
            <option value="threat">Threat</option>
            <option value="opportunity">Opportunity</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as MonitoringSignal["severity"] | "all")} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="warning">Warning</option>
            <option value="opportunity">Opportunity</option>
            <option value="info">Info</option>
          </select>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
            <option value="priority">Sort: Priority</option>
            <option value="score">Sort: Score</option>
            <option value="latest">Sort: Latest</option>
          </select>
          <div className="flex items-center text-xs text-primary font-mono">{isFetching ? "SYNCING" : "LIVE"}</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {moduleFilters.map((filter) => (
            <button key={filter.key} type="button" onClick={() => setModuleFilter(filter.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${moduleFilter === filter.key ? "bg-primary/20 text-primary" : "surface-glass text-muted-foreground hover:text-foreground"}`}>
              <filter.icon className="h-4 w-4" />
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {signals.map((signal) => {
            const meta = moduleMeta[signal.module] ?? fallbackModuleMeta;
            const Icon = meta.icon;
            const moduleCategory = resolveSignalCategory(signal);
            const actionType = moduleCategory === "threat" ? "exit" : "buy";
            const actionLabel = actionType === "buy" ? "Buy" : "Sell";
            const isTradableSignal = signal.module !== "tos";
            const action = isTradableSignal ? pendingActionByTokenAndType.get(`${signal.tokenId}:${actionType}`) : undefined;
            const watchlistToken = userWatchlistByTokenId.get(signal.tokenId);
            const signalKey = `${signal.tokenId}:${signal.module}`;
            const selectedMode =
              action?.executionMode ?? (signal.module === "drain" ? watchlistToken?.executionMode ?? "trade" : "trade");
            const amountKey = action?.id ?? signalKey;
            const amount = amountByActionId[amountKey] ?? action?.inAmount ?? "";
            const snapshot = snapshotByTokenId.get(signal.tokenId);
            const relatedAlerts = (alertsByToken.get(signal.tokenId) ?? [])
              .filter((alert) => alert.title.toLowerCase().includes(signal.module) || alert.message.toLowerCase().includes(signal.module))
              .slice(0, 2);

            return (
              <div key={signal.id} className={`rounded-xl border p-6 transition-all duration-300 hover:glow-border ${severityStyles[signal.severity]}`}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{meta.label}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${severityBadge[signal.severity]}`}>{signal.severity}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-muted text-muted-foreground">{moduleCategory}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-background/50 text-muted-foreground">{meta.group}</span>
                        {userTokenIdSet.has(signal.tokenId) && <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/20 text-primary">MY</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono text-primary">{signal.symbol}</span> · {signal.chain.toUpperCase()} · {new Date(signal.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono break-all">{signal.tokenId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Score</span>
                    <span className="text-2xl font-mono font-bold text-primary">{signal.score.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{signal.summary}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {signal.metrics.map((metric) => (
                    <div key={metric.label} className="surface-glass rounded-lg px-3 py-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{metric.label}</div>
                      <div className="text-sm font-mono font-semibold text-foreground">{metric.value}</div>
                    </div>
                  ))}
                </div>

                {snapshot && (
                  <div className="mt-4 rounded-lg border border-border/60 bg-background/20 p-3">
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground uppercase tracking-wider">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Full Model Scoreboard
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                      {scoreTiles(snapshot).map((tile) => (
                        <div key={`${signal.id}-${tile.label}`} className="rounded-md bg-background/50 border border-border/50 px-2 py-1.5">
                          <div className="text-[10px] text-muted-foreground">{tile.label}</div>
                          <div className="text-xs font-mono text-foreground">{tile.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {relatedAlerts.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {relatedAlerts.map((alert) => (
                      <div key={alert.id} className="rounded-lg border border-border/60 bg-background/30 p-3">
                        <p className="text-[10px] font-mono text-primary uppercase">{alert.severity}</p>
                        <p className="text-xs text-muted-foreground">{alert.title}</p>
                        <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-border/60 bg-background/30 p-3">
                  {isTradableSignal ? (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs text-muted-foreground">
                          {action
                            ? action.reason
                            : signal.module === "drain"
                              ? `Drain execution mode is read from watchlist settings (${selectedMode}).`
                              : `Direct ${actionLabel.toLowerCase()} execution from this signal.`}
                        </p>
                        <span className="text-[10px] font-mono uppercase text-primary">{action?.executionMode ?? selectedMode}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {selectedMode === "trade" && (
                          <input
                            value={amount}
                            onChange={(event) => setAmountByActionId((current) => ({ ...current, [amountKey]: event.target.value }))}
                            placeholder="amount (atomic)"
                            className="rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs w-44"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (action) {
                              void handleExecuteFromSignal(action.id, selectedMode === "trade" ? amount : undefined);
                              return;
                            }
                            void handleExecuteSignalInstant({
                              tokenId: signal.tokenId,
                              chain: signal.chain,
                              symbol: signal.symbol,
                              actionType,
                              inAmount: selectedMode === "trade" ? amount : undefined,
                              executionMode: selectedMode,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/20 px-2.5 py-1.5 text-xs font-semibold text-primary"
                        >
                          <Play className="h-3 w-3" />
                          {actionLabel}
                        </button>
                        {action && (
                          <button
                            type="button"
                            onClick={() => void handleDismiss(action.id)}
                            className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Network className="h-3.5 w-3.5 text-primary" />
                      TOS is a composite monitor signal; execute from the underlying module signal for precise action.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {signals.length === 0 && (
            <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
              {isLoading ? "Loading live quant signals..." : "No signals match the selected filters right now."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signals;
