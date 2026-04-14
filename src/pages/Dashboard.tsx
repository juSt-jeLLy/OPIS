import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Eye,
  Play,
  Shield,
  TrendingUp,
  Zap,
  X,
} from "lucide-react";
import { toast } from "sonner";
import GlowingCard from "@/components/GlowingCard";
import ParticleBackground from "@/components/ParticleBackground";
import { monitoringApi } from "@/features/monitoring/monitoring.api";
import { useMonitoringOverview } from "@/features/monitoring/hooks/use-monitoring-overview";
import {
  useMonitoringWatchlist,
  useReplaceMonitoringWatchlist,
} from "@/features/monitoring/hooks/use-monitoring-watchlist";
import { useMonitoringLiveStream } from "@/features/monitoring/hooks/use-monitoring-live-stream";
import { useMonitoringTokenSearch } from "@/features/monitoring/hooks/use-monitoring-token-search";
import type { MonitoringChain, MonitoringWatchlistToken } from "@/features/monitoring/monitoring.types";
import {
  useCreateDelegateWallet,
  useDismissTradingAction,
  useExecuteTradingAction,
  useTradingActions,
} from "@/features/trading/hooks/use-trading-actions";

const CHAINS: MonitoringChain[] = ["solana", "bsc", "eth", "base"];
type SearchChain = "all" | MonitoringChain;

const severityColor: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10",
  high: "text-orange-400 bg-orange-400/10",
  warning: "text-yellow-400 bg-yellow-400/10",
  opportunity: "text-emerald-400 bg-emerald-400/10",
  info: "text-primary bg-primary/10",
};

const tosColor = (score: number): string =>
  score > 60 ? "text-red-400" : score > 30 ? "text-yellow-400" : "text-emerald-400";

const tosBg = (score: number): string =>
  score > 60
    ? "bg-red-400/10 border-red-400/20"
    : score > 30
      ? "bg-yellow-400/10 border-yellow-400/20"
      : "bg-emerald-400/10 border-emerald-400/20";

const chainLabel = (chain: string): string => chain.charAt(0).toUpperCase() + chain.slice(1);

type TokenConfigDraft = {
  executionMode: "trade" | "delegate_exit";
  assetsId: string;
  buyAmountAtomic: string;
  sellAmountAtomic: string;
};

const toTokenConfigDraft = (token: MonitoringWatchlistToken): TokenConfigDraft => ({
  executionMode: token.executionMode ?? "trade",
  assetsId: token.assetsId ?? "",
  buyAmountAtomic: token.buyAmountAtomic ?? "",
  sellAmountAtomic: token.sellAmountAtomic ?? "",
});

const toTokenConfigPatch = (
  draft: TokenConfigDraft,
): Partial<Pick<MonitoringWatchlistToken, "executionMode" | "assetsId" | "buyAmountAtomic" | "sellAmountAtomic">> => ({
  executionMode: draft.executionMode,
  assetsId: draft.assetsId.trim() || undefined,
  buyAmountAtomic: draft.buyAmountAtomic.trim() || undefined,
  sellAmountAtomic: draft.sellAmountAtomic.trim() || undefined,
});

const isTokenConfigDirty = (token: MonitoringWatchlistToken, draft: TokenConfigDraft): boolean => {
  const persisted = toTokenConfigDraft(token);
  return (
    draft.executionMode !== persisted.executionMode ||
    draft.assetsId !== persisted.assetsId ||
    draft.buyAmountAtomic !== persisted.buyAmountAtomic ||
    draft.sellAmountAtomic !== persisted.sellAmountAtomic
  );
};

const Dashboard = () => {
  useMonitoringLiveStream();

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchChain, setSearchChain] = useState<SearchChain>("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [tokenConfigDrafts, setTokenConfigDrafts] = useState<Record<string, TokenConfigDraft>>({});
  const [tokenConfigSaveState, setTokenConfigSaveState] = useState<Record<string, "saving" | "error">>({});
  const [walletCreationTokenId, setWalletCreationTokenId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError } = useMonitoringOverview();
  const { data: watchlistData } = useMonitoringWatchlist();
  const replaceWatchlist = useReplaceMonitoringWatchlist();
  const createDelegateWallet = useCreateDelegateWallet();
  const { data: actionsData } = useTradingActions();
  const executeAction = useExecuteTradingAction();
  const dismissAction = useDismissTradingAction();

  const userWatchlist = useMemo(() => watchlistData?.userWatchlist ?? [], [watchlistData?.userWatchlist]);
  const systemWatchlist = useMemo(() => watchlistData?.systemWatchlist ?? [], [watchlistData?.systemWatchlist]);
  const userWatchlistTokenIds = useMemo(() => new Set(userWatchlist.map((token) => token.tokenId)), [userWatchlist]);

  const { data: tokenSearchData, isFetching: isTokenSearchFetching } = useMonitoringTokenSearch(
    searchQuery,
    searchChain,
    isSearchOpen || searchInput.trim().length > 0,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent): void => {
      if (!searchContainerRef.current) {
        return;
      }

      if (searchContainerRef.current.contains(event.target as Node)) {
        return;
      }

      setIsSearchOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const availableSearchTokens = useMemo(() => {
    return (tokenSearchData?.tokens ?? []).filter((token) => !userWatchlistTokenIds.has(token.tokenId));
  }, [tokenSearchData?.tokens, userWatchlistTokenIds]);

  const handleReplaceUserWatchlist = async (tokens: MonitoringWatchlistToken[], options?: { runCycle?: boolean }) => {
    await replaceWatchlist.mutateAsync(tokens);
    if (options?.runCycle === false) {
      return;
    }

    await monitoringApi.runCycle().catch(() => {
      toast.warning("Watchlist updated. New signals will appear in the next cycle.");
    });
  };

  const handleAddToken = async (token: MonitoringWatchlistToken) => {
    const exists = userWatchlist.some((entry) => entry.tokenId.toLowerCase() === token.tokenId.toLowerCase());
    if (exists) {
      toast.info("Token already exists in your watchlist.");
      return;
    }

    try {
      await handleReplaceUserWatchlist([
        { ...token, executionMode: "trade", sellAmountAtomic: token.sellAmountAtomic ?? "100000000" },
        ...userWatchlist,
      ]);
      toast.success("Token added to your watchlist.");
    } catch {
      toast.error("Failed to update watchlist.");
    }
  };

  const handleRemoveToken = async (tokenId: string) => {
    try {
      await handleReplaceUserWatchlist(userWatchlist.filter((token) => token.tokenId !== tokenId));
      setTokenConfigDrafts((current) => {
        const next = { ...current };
        delete next[tokenId];
        return next;
      });
      setTokenConfigSaveState((current) => {
        const next = { ...current };
        delete next[tokenId];
        return next;
      });
      toast.success("Token removed from your watchlist.");
    } catch {
      toast.error("Failed to update watchlist.");
    }
  };

  const handleUpdateTokenConfig = async (
    tokenId: string,
    patch: Partial<
      Pick<MonitoringWatchlistToken, "executionMode" | "assetsId" | "buyAmountAtomic" | "sellAmountAtomic">
    >,
  ): Promise<boolean> => {
    const next = userWatchlist.map((token) => {
      if (token.tokenId !== tokenId) {
        return token;
      }

      return { ...token, ...patch };
    });

    try {
      await handleReplaceUserWatchlist(next, { runCycle: false });
      return true;
    } catch {
      toast.error("Failed to save token execution settings.");
      return false;
    }
  };

  const handleDraftChange = (token: MonitoringWatchlistToken, patch: Partial<TokenConfigDraft>): void => {
    setTokenConfigDrafts((current) => ({
      ...current,
      [token.tokenId]: {
        ...toTokenConfigDraft(token),
        ...(current[token.tokenId] ?? {}),
        ...patch,
      },
    }));
    setTokenConfigSaveState((current) => {
      if (!current[token.tokenId]) {
        return current;
      }

      const next = { ...current };
      delete next[token.tokenId];
      return next;
    });
  };

  const handleCreateDelegateWallet = async (token: MonitoringWatchlistToken): Promise<void> => {
    setWalletCreationTokenId(token.tokenId);
    try {
      const preferredName = `${(token.symbol ?? token.chain).toLowerCase()}_${Date.now().toString().slice(-6)}`;
      const response = await createDelegateWallet.mutateAsync({ assetsName: preferredName });
      const wallet = response.wallet;
      handleDraftChange(token, { assetsId: wallet.assetsId });
      const primaryAddress = wallet.addressList?.[0]?.address;
      if (primaryAddress) {
        toast.success(`Wallet created. assetsId set in draft. Primary address: ${primaryAddress}`);
      } else {
        toast.success("Wallet created. assetsId set in draft.");
      }
    } catch {
      toast.error("Unable to create delegate wallet right now.");
    } finally {
      setWalletCreationTokenId(null);
    }
  };

  const handleSaveTokenConfig = async (token: MonitoringWatchlistToken): Promise<void> => {
    const draft = tokenConfigDrafts[token.tokenId] ?? toTokenConfigDraft(token);
    if (!isTokenConfigDirty(token, draft)) {
      return;
    }

    setTokenConfigSaveState((current) => ({ ...current, [token.tokenId]: "saving" }));
    const saved = await handleUpdateTokenConfig(token.tokenId, toTokenConfigPatch(draft));
    if (!saved) {
      setTokenConfigSaveState((current) => ({ ...current, [token.tokenId]: "error" }));
      return;
    }

    setTokenConfigSaveState((current) => {
      const next = { ...current };
      delete next[token.tokenId];
      return next;
    });
    setTokenConfigDrafts((current) => {
      const next = { ...current };
      delete next[token.tokenId];
      return next;
    });
    toast.success(`${token.symbol ?? token.tokenId} settings saved.`);
  };

  const handleExecuteAction = async (actionId: string) => {
    try {
      await executeAction.mutateAsync({ actionId });
      toast.success("Trade action submitted to AVE Trading Skill.");
    } catch {
      toast.error("Execution failed. Check assetsId and delegate wallet permissions.");
    }
  };

  const handleDismissAction = async (actionId: string) => {
    try {
      await dismissAction.mutateAsync(actionId);
      toast.success("Action dismissed.");
    } catch {
      toast.error("Unable to dismiss action.");
    }
  };

  const orderedSnapshots = useMemo(() => {
    const snapshots = data?.snapshots ?? [];
    return [...snapshots].sort((left, right) => {
      const leftUser = userWatchlistTokenIds.has(left.tokenId) ? 1 : 0;
      const rightUser = userWatchlistTokenIds.has(right.tokenId) ? 1 : 0;
      if (leftUser !== rightUser) {
        return rightUser - leftUser;
      }

      return right.tos.score - left.tos.score;
    });
  }, [data?.snapshots, userWatchlistTokenIds]);

  const alerts = data?.alerts ?? [];
  const pendingActions = useMemo(
    () =>
      (actionsData?.actions ?? [])
        .filter((action) => action.status === "pending")
        .sort((left, right) => right.priority - left.priority)
        .slice(0, 8),
    [actionsData?.actions],
  );
  const snapshotByTokenId = useMemo(
    () => new Map(orderedSnapshots.map((snapshot) => [snapshot.tokenId, snapshot])),
    [orderedSnapshots],
  );

  const stats = [
    {
      icon: Eye,
      label: "Tokens Monitored",
      value: String(orderedSnapshots.length),
      change: isFetching ? "sync" : "live",
    },
    {
      icon: Shield,
      label: "Threats Active",
      value: String(
        orderedSnapshots.filter((token) => token.tos.polarity === "threat" && token.tos.score > 60).length,
      ),
      change: "auto",
    },
    {
      icon: TrendingUp,
      label: "Opportunities",
      value: String(
        orderedSnapshots.filter((token) => token.tos.polarity === "opportunity" && token.tos.score > 60).length,
      ),
      change: "auto",
    },
    {
      icon: Activity,
      label: "Alerts",
      value: String(alerts.length),
      change: isError ? "error" : "live",
    },
  ];

  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient-primary">OPIS</span> Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time threat and opportunity monitoring across user and system watchlists
          </p>
        </div>

        <GlowingCard className="mb-6">
          <div ref={searchContainerRef} className="mb-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen((value) => !value)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-foreground">Search & Add Tokens</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${isSearchOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isSearchOpen && (
              <div className="mt-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 mb-3">
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search token by name, symbol, or address"
                    className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                  />
                  <select
                    value={searchChain}
                    onChange={(event) => setSearchChain(event.target.value as SearchChain)}
                    className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                  >
                    <option value="all">ALL CHAINS</option>
                    {CHAINS.map((chain) => (
                      <option key={chain} value={chain}>
                        {chain.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/30 p-2 max-h-56 overflow-y-auto">
                  <div className="space-y-1">
                    {availableSearchTokens.slice(0, 20).map((token) => (
                      <div
                        key={token.tokenId}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-primary/5"
                      >
                        <div>
                          <div className="text-sm font-mono text-foreground">{token.symbol ?? token.tokenId}</div>
                          <div className="text-xs text-muted-foreground">
                            {token.name ?? token.tokenId} · {token.chain.toUpperCase()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddToken(token)}
                          disabled={replaceWatchlist.isPending}
                          className="rounded-lg px-3 py-1 text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                    {isTokenSearchFetching && (
                      <p className="px-2 py-2 text-xs text-muted-foreground">Searching live token list...</p>
                    )}
                    {!isTokenSearchFetching && availableSearchTokens.length === 0 && (
                      <p className="px-2 py-2 text-xs text-muted-foreground">No tokens found for this query/filter.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {userWatchlist.map((token) => {
              const draft = tokenConfigDrafts[token.tokenId] ?? toTokenConfigDraft(token);
              const saveState = tokenConfigSaveState[token.tokenId];
              const dirty = isTokenConfigDirty(token, draft);
              const saveBadgeClass =
                saveState === "saving"
                  ? "bg-primary/15 text-primary"
                  : saveState === "error"
                    ? "bg-red-500/15 text-red-400"
                    : dirty
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-emerald-500/15 text-emerald-400";
              const saveBadgeText =
                saveState === "saving" ? "Saving..." : saveState === "error" ? "Save Failed" : dirty ? "Unsaved" : "Saved";

              return (
              <div key={token.tokenId} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-mono text-sm text-foreground">{token.symbol ?? token.tokenId}</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {token.name ?? token.tokenId} · {token.chain.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-1 text-[10px] font-mono uppercase ${saveBadgeClass}`}>{saveBadgeText}</span>
                    <button
                      type="button"
                      onClick={() => void handleSaveTokenConfig(token)}
                      disabled={!dirty || saveState === "saving" || replaceWatchlist.isPending}
                      className="rounded-lg bg-primary/20 px-3 py-1 text-xs font-semibold text-primary disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemoveToken(token.tokenId)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                  <select
                    value={draft.executionMode}
                    onChange={(event) =>
                      handleDraftChange(token, {
                        executionMode: event.target.value === "delegate_exit" ? "delegate_exit" : "trade",
                      })
                    }
                    className="rounded-lg border border-border bg-background/60 px-2 py-2 text-xs"
                  >
                    <option value="trade">Trade API (manual)</option>
                    <option value="delegate_exit">Delegate Auto Exit</option>
                  </select>
                  <div className="space-y-2">
                    <input
                      value={draft.assetsId}
                      onChange={(event) => handleDraftChange(token, { assetsId: event.target.value })}
                      placeholder="Delegate wallet assetsId (required for all trades)"
                      className="w-full rounded-lg border border-border bg-background/60 px-2 py-2 text-xs"
                    />
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => void handleCreateDelegateWallet(token)}
                        disabled={walletCreationTokenId === token.tokenId || createDelegateWallet.isPending}
                        className="rounded-lg bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        {walletCreationTokenId === token.tokenId ? "Creating..." : "Create Delegate Wallet"}
                      </button>
                    </div>
                    {draft.executionMode === "delegate_exit" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={draft.sellAmountAtomic}
                          onChange={(event) => handleDraftChange(token, { sellAmountAtomic: event.target.value })}
                          placeholder="Auto-exit amount (atomic)"
                          className="rounded-lg border border-border bg-background/60 px-2 py-2 text-xs"
                        />
                        <div className="rounded-lg border border-border/60 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
                          Drain auto-exit will use this token config directly.
                        </div>
                      </div>
                    ) : (
                      <input
                        value={draft.buyAmountAtomic}
                        onChange={(event) => handleDraftChange(token, { buyAmountAtomic: event.target.value })}
                        placeholder="Default buy amount (atomic, optional)"
                        className="rounded-lg border border-border bg-background/60 px-2 py-2 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>
            )})}
            {userWatchlist.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No custom tokens yet. Added tokens stay pinned and can be set to Trade API or Delegate Auto Exit.
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">System Active Tokens (WSS Live)</p>
            <div className="flex flex-wrap gap-2">
              {systemWatchlist.slice(0, 12).map((token) => (
                <div key={token.tokenId} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground">
                  <span className="font-mono">{token.symbol ?? token.tokenId}</span>
                  <span className="text-muted-foreground">{token.chain.toUpperCase()}</span>
                </div>
              ))}
              {systemWatchlist.length === 0 && (
                <p className="text-sm text-muted-foreground">System watchlist is initializing...</p>
              )}
            </div>
          </div>
        </GlowingCard>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="surface-glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-primary font-mono">{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GlowingCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Live TOS Feed
                </h2>
                <span className="text-xs font-mono text-primary">{isFetching ? "SYNC" : "LIVE"}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left pb-3">Token</th>
                      <th className="text-left pb-3">Type</th>
                      <th className="text-left pb-3">Strat</th>
                      <th className="text-left pb-3">Chain</th>
                      <th className="text-center pb-3">TOS</th>
                      <th className="text-center pb-3">Cabal</th>
                      <th className="text-center pb-3">Drain</th>
                      <th className="text-center pb-3">Conv.</th>
                      <th className="text-center pb-3">Narr.</th>
                      <th className="text-center pb-3">DCA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedSnapshots.map((snapshot) => {
                      const isUser = userWatchlistTokenIds.has(snapshot.tokenId);
                      return (
                        <tr
                          key={snapshot.tokenId}
                          className={`border-b border-border/50 hover:bg-primary/5 transition-colors ${
                            isUser ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {snapshot.tos.polarity === "threat" ? (
                                <ArrowDownRight className="h-4 w-4 text-red-400" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                              )}
                              <span className="font-mono font-semibold text-foreground">{snapshot.symbol}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                isUser ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isUser ? "MY" : "SYSTEM"}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-primary font-mono">{snapshot.strategy.mode}</td>
                          <td className="py-3 text-sm text-muted-foreground">{chainLabel(snapshot.chain)}</td>
                          <td className="py-3 text-center">
                            <span
                              className={`font-mono font-bold text-sm px-2 py-1 rounded border ${tosBg(
                                snapshot.tos.score,
                              )} ${tosColor(snapshot.tos.score)}`}
                            >
                              {snapshot.tos.score.toFixed(2)}
                            </span>
                          </td>
                          <td className={`py-3 text-center font-mono text-sm ${tosColor(snapshot.moduleScores.cabal.score)}`}>
                            {snapshot.moduleScores.cabal.score.toFixed(2)}
                          </td>
                          <td className={`py-3 text-center font-mono text-sm ${tosColor(snapshot.moduleScores.drain.score)}`}>
                            {snapshot.moduleScores.drain.score.toFixed(2)}
                          </td>
                          <td className={`py-3 text-center font-mono text-sm ${tosColor(snapshot.moduleScores.conviction.score)}`}>
                            {snapshot.moduleScores.conviction.score.toFixed(2)}
                          </td>
                          <td className={`py-3 text-center font-mono text-sm ${tosColor(snapshot.moduleScores.narrative.score)}`}>
                            {snapshot.moduleScores.narrative.score.toFixed(2)}
                          </td>
                          <td className={`py-3 text-center font-mono text-sm ${tosColor(snapshot.moduleScores.dca.score)}`}>
                            {snapshot.moduleScores.dca.score.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    {orderedSnapshots.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                          {isLoading ? "Loading live monitoring feed..." : "No live data yet. Verify backend API key and watchlist."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlowingCard>
          </div>

          <div className="space-y-6">
            <GlowingCard>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Trade Actions
              </h2>
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground">
                        {action.actionType === "buy" ? "Buy" : "Exit"} {action.symbol}
                      </p>
                      <span className="text-[10px] font-mono uppercase text-primary">{action.executionMode}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{action.reason}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleExecuteAction(action.id)}
                        disabled={executeAction.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/20 px-2.5 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" />
                        Execute
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDismissAction(action.id)}
                        disabled={dismissAction.isPending}
                        className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
                {pendingActions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pending buy/exit actions right now.</p>
                )}
              </div>
            </GlowingCard>

            <GlowingCard>
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Alert Stream
              </h2>
              <div className="space-y-4">
                {alerts.map((alert) => {
                  const tokenSnapshot = snapshotByTokenId.get(alert.tokenId);
                  const tokenSymbol = tokenSnapshot?.symbol ?? alert.tokenId;

                  return (
                    <div key={alert.id} className="flex gap-3">
                      <div
                        className={`mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          severityColor[alert.severity] ?? severityColor.info
                        }`}
                      >
                        {alert.severity}
                      </div>
                      <div>
                        <p className="text-xs font-mono text-primary">
                          {tokenSymbol} · {alert.chain.toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">{alert.title}</p>
                        <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                        <span className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {alerts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No alerts fired yet. Live WSS alerts will appear here automatically.</p>
                )}
              </div>
            </GlowingCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
