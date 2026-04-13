import { Activity, ArrowDownRight, ArrowUpRight, DollarSign, Play, Shield, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import GlowingCard from "@/components/GlowingCard";
import ParticleBackground from "@/components/ParticleBackground";
import { useMonitoringLiveStream } from "@/features/monitoring/hooks/use-monitoring-live-stream";
import {
  useDismissTradingAction,
  useExecuteTradingAction,
  useTradingActions,
  useTradingTrades,
} from "@/features/trading/hooks/use-trading-actions";

const Trading = () => {
  useMonitoringLiveStream();
  const { data: actionsData, isLoading: actionsLoading } = useTradingActions();
  const { data: tradesData, isLoading: tradesLoading } = useTradingTrades();
  const executeAction = useExecuteTradingAction();
  const dismissAction = useDismissTradingAction();

  const actions = actionsData?.actions ?? [];
  const pendingActions = actions.filter((action) => action.status === "pending");
  const trades = tradesData?.trades ?? [];
  const confirmedTrades = trades.filter((trade) => trade.status === "confirmed");
  const failedTrades = trades.filter((trade) => trade.status === "error");

  const handleExecute = async (actionId: string) => {
    try {
      await executeAction.mutateAsync({ actionId });
      toast.success("Order submitted. Status will update live.");
    } catch {
      toast.error("Unable to execute action. Check assetsId and API permissions.");
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

  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient-primary">Trading</span> Engine
          </h1>
          <p className="text-muted-foreground">Real AVE Trading Skill execution: quote → order → status</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="surface-glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Pending Actions</span></div>
            <div className="text-2xl font-bold text-foreground">{pendingActions.length}</div>
          </div>
          <div className="surface-glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Orders Tracked</span></div>
            <div className="text-2xl font-bold text-foreground">{trades.length}</div>
          </div>
          <div className="surface-glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Confirmed</span></div>
            <div className="text-2xl font-bold text-emerald-400">{confirmedTrades.length}</div>
          </div>
          <div className="surface-glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Failed</span></div>
            <div className="text-2xl font-bold text-red-400">{failedTrades.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GlowingCard>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Action Queue
            </h2>
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <div key={action.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{action.actionType === "buy" ? "Buy" : "Exit"} {action.symbol}</p>
                    <span className="text-[10px] font-mono uppercase text-primary">{action.executionMode}</span>
                  </div>
                  <p className="text-xs text-muted-foreground my-2">{action.reason}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleExecute(action.id)}
                      className="rounded-lg bg-primary/20 px-2.5 py-1.5 text-xs font-semibold text-primary"
                    >
                      Execute
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDismiss(action.id)}
                      className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
              {pendingActions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {actionsLoading ? "Loading actions..." : "No pending actions at the moment."}
                </p>
              )}
            </div>
          </GlowingCard>

          <GlowingCard>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live Order Status
            </h2>
            <div className="space-y-3">
              {trades.slice(0, 8).map((trade) => (
                <div key={trade.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {trade.swapType === "buy" ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                      <p className="font-mono text-sm text-foreground">{trade.symbol}</p>
                    </div>
                    <span className="text-xs font-mono text-primary uppercase">{trade.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground break-all mt-1">Order: {trade.orderId}</p>
                  {trade.txHash && <p className="text-xs text-muted-foreground break-all">Tx: {trade.txHash}</p>}
                </div>
              ))}
              {trades.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {tradesLoading ? "Loading trades..." : "No tracked executions yet."}
                </p>
              )}
            </div>
          </GlowingCard>
        </div>
      </div>
    </div>
  );
};

export default Trading;
