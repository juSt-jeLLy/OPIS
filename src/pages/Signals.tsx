import { useMemo, useState } from "react";
import { Activity, Brain, Eye, Globe, Repeat, Shield } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import { useMonitoringSignals } from "@/features/monitoring/hooks/use-monitoring-signals";
import { useMonitoringWatchlist } from "@/features/monitoring/hooks/use-monitoring-watchlist";
import { useMonitoringLiveStream } from "@/features/monitoring/hooks/use-monitoring-live-stream";
import type { MonitoringSignal } from "@/features/monitoring/monitoring.types";

const moduleMeta = {
  cabal: { icon: Eye, label: "Cabal Fingerprinter", category: "threat" },
  drain: { icon: Shield, label: "DEV Drain Velocity", category: "threat" },
  conviction: { icon: Brain, label: "Conviction Stack", category: "opportunity" },
  narrative: { icon: Globe, label: "Narrative Radar", category: "opportunity" },
  dca: { icon: Repeat, label: "DCA Accumulation", category: "opportunity" },
} as const;

const severityPriority: Record<MonitoringSignal["severity"], number> = {
  critical: 5,
  high: 4,
  warning: 3,
  opportunity: 2,
  info: 1,
};

const severityStyles: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/5",
  high: "border-orange-400/30 bg-orange-400/5",
  warning: "border-yellow-400/30 bg-yellow-400/5",
  opportunity: "border-emerald-400/30 bg-emerald-400/5",
  info: "border-primary/30 bg-primary/5",
};

const severityBadge: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400",
  high: "bg-orange-400/10 text-orange-400",
  warning: "bg-yellow-400/10 text-yellow-400",
  opportunity: "bg-emerald-400/10 text-emerald-400",
  info: "bg-primary/10 text-primary",
};

type CategoryFilter = "all" | "my" | "threat" | "opportunity";
type SortMode = "priority" | "score" | "latest";
type ModuleFilter = "all" | MonitoringSignal["module"];
const SYSTEM_SIGNAL_LIMIT = 18;

const Signals = () => {
  useMonitoringLiveStream();
  const { data, isLoading, isFetching } = useMonitoringSignals();
  const { data: watchlistData } = useMonitoringWatchlist();
  const userTokenIdSet = useMemo(
    () => new Set((watchlistData?.userWatchlist ?? []).map((token) => token.tokenId)),
    [watchlistData?.userWatchlist],
  );

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<MonitoringSignal["severity"] | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  const signals = useMemo(() => {
    const dedupedSignals: MonitoringSignal[] = [];
    const dedupe = new Set<string>();
    (data?.signals ?? []).forEach((signal) => {
      const key = `${signal.tokenId}:${signal.module}`;
      if (dedupe.has(key)) {
        return;
      }

      dedupe.add(key);
      dedupedSignals.push(signal);
    });

    const baseSignals = dedupedSignals.map((signal) => {
      const module = moduleMeta[signal.module];
      return {
        ...signal,
        moduleCategory: module.category,
        isUserWatchlist: userTokenIdSet.has(signal.tokenId),
      };
    });

    const filtered = baseSignals.filter((signal) => {
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

  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2"><span className="text-gradient-primary">Signal</span> Intelligence</h1>
          <p className="text-muted-foreground">Live signals sorted by priority and category. Your watchlist signals are pinned first.</p>
        </div>

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
          {[{ key: "all", label: "All", icon: Activity }, { key: "cabal", label: "Cabal", icon: Eye }, { key: "drain", label: "Drain", icon: Shield }, { key: "conviction", label: "Conviction", icon: Brain }, { key: "narrative", label: "Narrative", icon: Globe }, { key: "dca", label: "DCA", icon: Repeat }].map((filter) => (
            <button key={filter.key} type="button" onClick={() => setModuleFilter(filter.key as ModuleFilter)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${moduleFilter === filter.key ? "bg-primary/20 text-primary" : "surface-glass text-muted-foreground hover:text-foreground"}`}>
              <filter.icon className="h-4 w-4" />{filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {signals.map((signal) => {
            const meta = moduleMeta[signal.module];
            const Icon = meta.icon;
            return (
              <div key={signal.id} className={`rounded-xl border p-6 transition-all duration-300 hover:glow-border ${severityStyles[signal.severity] ?? severityStyles.info}`}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{meta.label}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${severityBadge[signal.severity] ?? severityBadge.info}`}>{signal.severity}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-muted text-muted-foreground">{meta.category}</span>
                        {signal.isUserWatchlist && <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/20 text-primary">MY</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono text-primary">{signal.symbol}</span> · {signal.chain.toUpperCase()} · {new Date(signal.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono break-all">{signal.tokenId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Score</span><span className="text-2xl font-mono font-bold text-primary">{signal.score.toFixed(2)}</span></div>
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
              </div>
            );
          })}
          {signals.length === 0 && <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">{isLoading ? "Loading live quant signals..." : "No signals match the selected filters right now."}</div>}
        </div>
      </div>
    </div>
  );
};

export default Signals;
