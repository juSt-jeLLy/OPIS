import { Eye, Shield, Brain, Globe, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import ParticleBackground from "@/components/ParticleBackground";

const mockSignals = [
  {
    id: 1,
    module: "Cabal Fingerprinter",
    icon: Eye,
    token: "DOGENAI",
    chain: "Solana",
    score: 78,
    severity: "high",
    time: "3m ago",
    details: "5 wallets share common SOL funder (7xQ...mA3). Cluster holds 22.4% supply. All bought within 8-min window at launch.",
    metrics: [
      { label: "Cluster Size", value: "5 / 100" },
      { label: "Supply Held", value: "22.4%" },
      { label: "Time Delta", value: "< 480s" },
      { label: "Shared Funders", value: "1" },
    ],
  },
  {
    id: 2,
    module: "DEV Drain Velocity",
    icon: Shield,
    token: "RUGDAO",
    chain: "BSC",
    score: 92,
    severity: "critical",
    time: "12m ago",
    details: "Creator wallet (0xf2...8B) removed $45K liquidity across 11 transactions in 4 hours. Drain rate: 4.2%/hr. Dynamic threshold breached.",
    metrics: [
      { label: "Drain Rate", value: "4.2%/hr" },
      { label: "Total Removed", value: "$45,200" },
      { label: "Event Count", value: "11" },
      { label: "DEV Ratio", value: "87%" },
    ],
  },
  {
    id: 3,
    module: "Conviction Stack",
    icon: Brain,
    token: "SCILAB",
    chain: "BSC",
    score: 89,
    severity: "opportunity",
    time: "18m ago",
    details: "7 smart wallets with avg 82% win rate are DCA-ing into SCILAB. Avg 4.3 buys each. 3 wallets held through 35% drawdown.",
    metrics: [
      { label: "Smart Wallets", value: "7 / 50" },
      { label: "Avg Conviction", value: "84" },
      { label: "Avg Buys", value: "4.3" },
      { label: "Held Drawdown", value: "3 wallets" },
    ],
  },
  {
    id: 4,
    module: "Narrative Radar",
    icon: Globe,
    token: "AI Agents",
    chain: "Cross-Chain",
    score: 65,
    severity: "info",
    time: "25m ago",
    details: "AI Agents narrative volume accelerating 45% on BSC. Solana & ETH at < 8% acceleration. Estimated rotation window: 3-5 hours.",
    metrics: [
      { label: "Source Chain", value: "BSC (+45%)" },
      { label: "Target Chains", value: "SOL, ETH" },
      { label: "Window", value: "3-5 hours" },
      { label: "Tokens Found", value: "12" },
    ],
  },
];

const severityStyles: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/5",
  high: "border-orange-400/30 bg-orange-400/5",
  opportunity: "border-emerald-400/30 bg-emerald-400/5",
  info: "border-primary/30 bg-primary/5",
};

const severityBadge: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400",
  high: "bg-orange-400/10 text-orange-400",
  opportunity: "bg-emerald-400/10 text-emerald-400",
  info: "bg-primary/10 text-primary",
};

const Signals = () => {
  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient-primary">Signal</span> Intelligence
          </h1>
          <p className="text-muted-foreground">Detailed signal breakdowns from all 4 monitoring modules</p>
        </div>

        {/* Signal Filters */}
        <div className="flex flex-wrap gap-2 mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
          {[
            { label: "All", icon: Activity },
            { label: "Cabal", icon: Eye },
            { label: "Drain", icon: Shield },
            { label: "Conviction", icon: Brain },
            { label: "Narrative", icon: Globe },
          ].map((filter) => (
            <button
              key={filter.label}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all surface-glass hover:glow-border text-muted-foreground hover:text-foreground"
            >
              <filter.icon className="h-4 w-4" />
              {filter.label}
            </button>
          ))}
        </div>

        {/* Signal Cards */}
        <div className="space-y-6">
          {mockSignals.map((signal, i) => (
            <div
              key={signal.id}
              className={`rounded-xl border p-6 transition-all duration-300 hover:glow-border opacity-0 animate-fade-up ${severityStyles[signal.severity]}`}
              style={{ animationDelay: `${300 + i * 150}ms`, animationFillMode: "forwards" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <signal.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{signal.module}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${severityBadge[signal.severity]}`}>
                        {signal.severity}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono text-primary">{signal.token}</span> · {signal.chain} · {signal.time}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Score</span>
                  <span className="text-2xl font-mono font-bold text-primary">{signal.score}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{signal.details}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {signal.metrics.map((metric) => (
                  <div key={metric.label} className="surface-glass rounded-lg px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{metric.label}</div>
                    <div className="text-sm font-mono font-semibold text-foreground">{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Signals;
