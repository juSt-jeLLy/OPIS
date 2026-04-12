import { Shield, Target, Activity, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import ParticleBackground from "@/components/ParticleBackground";
import { Button } from "@/components/ui/button";

const mockPositions = [
  { token: "SCILAB", chain: "BSC", strategy: "Conviction Entry", entry: 0.00234, current: 0.00312, pnl: 33.3, size: 250, status: "open" },
  { token: "NEURAL", chain: "Solana", strategy: "Conviction Entry", entry: 0.0089, current: 0.0115, pnl: 29.2, size: 180, status: "open" },
  { token: "BASEMEME", chain: "Base", strategy: "Narrative Ride", entry: 0.00045, current: 0.00052, pnl: 15.6, size: 150, status: "open" },
];

const mockHistory = [
  { token: "DOGENAI", chain: "Solana", strategy: "Threat Exit", entry: 0.0054, exit: 0.0048, pnl: -11.1, size: 200, date: "Apr 11" },
  { token: "PEPEX", chain: "ETH", strategy: "Threat Exit", entry: 0.12, exit: 0.105, pnl: -12.5, size: 300, date: "Apr 10" },
  { token: "AIBOT", chain: "BSC", strategy: "Conviction Entry", entry: 0.0023, exit: 0.0045, pnl: 95.6, size: 200, date: "Apr 9" },
  { token: "DESCI2", chain: "Solana", strategy: "Narrative Ride", entry: 0.0078, exit: 0.0112, pnl: 43.6, size: 150, date: "Apr 8" },
];

const strategies = [
  {
    icon: Shield,
    title: "Threat Exit",
    subtitle: "Strategy A",
    active: true,
    threshold: 65,
    desc: "Auto-exit on TOS threat > threshold with MEV protection",
  },
  {
    icon: Target,
    title: "Conviction Entry",
    subtitle: "Strategy B",
    active: true,
    threshold: 65,
    desc: "Auto-enter high conviction + low risk tokens with TP/SL",
  },
  {
    icon: Activity,
    title: "Narrative Ride",
    subtitle: "Strategy C",
    active: false,
    threshold: 60,
    desc: "Cross-chain rotation entries with backtested win rate filter",
  },
];

const Trading = () => {
  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient-primary">Trading</span> Engine
          </h1>
          <p className="text-muted-foreground">Autonomous strategy execution with full position tracking</p>
        </div>

        {/* Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {strategies.map((strat, i) => (
            <div
              key={strat.title}
              className={`surface-glass rounded-xl p-5 border transition-all opacity-0 animate-fade-up ${strat.active ? "border-primary/30" : "border-border"}`}
              style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: "forwards" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <strat.icon className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">{strat.title}</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${strat.active ? "bg-emerald-400/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  {strat.active ? "Active" : "Paused"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{strat.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Threshold</span>
                <span className="font-mono text-sm text-primary">{strat.threshold}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Portfolio Summary */}
          <div className="opacity-0 animate-fade-up" style={{ animationDelay: "350ms", animationFillMode: "forwards" }}>
            <GlowingCard>
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Portfolio
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Total Value</div>
                  <div className="text-3xl font-bold text-foreground font-mono">$1,847</div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Open P&L</div>
                    <div className="text-lg font-mono text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" />
                      +$186
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                    <div className="text-lg font-mono text-foreground">67%</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Active Positions</div>
                  <div className="text-lg font-mono text-primary">{mockPositions.length}</div>
                </div>
              </div>
            </GlowingCard>
          </div>

          {/* Open Positions */}
          <div className="lg:col-span-2 opacity-0 animate-fade-up" style={{ animationDelay: "450ms", animationFillMode: "forwards" }}>
            <GlowingCard>
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Open Positions
              </h2>
              <div className="space-y-3">
                {mockPositions.map((pos) => (
                  <div
                    key={pos.token}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      <div>
                        <span className="font-mono font-semibold text-foreground">{pos.token}</span>
                        <div className="text-xs text-muted-foreground">{pos.chain} · {pos.strategy}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-emerald-400">+{pos.pnl}%</div>
                      <div className="text-xs text-muted-foreground">${pos.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            </GlowingCard>
          </div>
        </div>

        {/* Trade History */}
        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "550ms", animationFillMode: "forwards" }}>
          <GlowingCard>
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Trade History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-3 font-medium">Token</th>
                    <th className="text-left pb-3 font-medium">Strategy</th>
                    <th className="text-right pb-3 font-medium">Entry</th>
                    <th className="text-right pb-3 font-medium">Exit</th>
                    <th className="text-right pb-3 font-medium">P&L</th>
                    <th className="text-right pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mockHistory.map((trade, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3">
                        <span className="font-mono font-semibold text-foreground">{trade.token}</span>
                        <div className="text-xs text-muted-foreground">{trade.chain}</div>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">{trade.strategy}</td>
                      <td className="py-3 text-right font-mono text-sm text-muted-foreground">${trade.entry}</td>
                      <td className="py-3 text-right font-mono text-sm text-muted-foreground">${trade.exit}</td>
                      <td className="py-3 text-right">
                        <span className={`font-mono text-sm ${trade.pnl > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {trade.pnl > 0 ? "+" : ""}{trade.pnl}%
                        </span>
                      </td>
                      <td className="py-3 text-right text-sm text-muted-foreground">{trade.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowingCard>
        </div>
      </div>
    </div>
  );
};

export default Trading;
