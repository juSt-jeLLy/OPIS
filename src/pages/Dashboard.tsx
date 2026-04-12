import { Shield, AlertTriangle, TrendingUp, Activity, Eye, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import ParticleBackground from "@/components/ParticleBackground";

const mockTokens = [
  { symbol: "DOGENAI", chain: "Solana", tos: 82, polarity: "threat", cabal: 78, drain: 65, conviction: 12, narrative: 45 },
  { symbol: "SCILAB", chain: "BSC", tos: 71, polarity: "opportunity", cabal: 15, drain: 8, conviction: 89, narrative: 72 },
  { symbol: "PEPEX", chain: "ETH", tos: 55, polarity: "threat", cabal: 62, drain: 45, conviction: 22, narrative: 18 },
  { symbol: "NEURAL", chain: "Solana", tos: 68, polarity: "opportunity", cabal: 20, drain: 5, conviction: 82, narrative: 65 },
  { symbol: "RUGDAO", chain: "BSC", tos: 91, polarity: "threat", cabal: 88, drain: 92, conviction: 5, narrative: 10 },
  { symbol: "BASEMEME", chain: "Base", tos: 43, polarity: "opportunity", cabal: 30, drain: 12, conviction: 55, narrative: 40 },
];

const mockAlerts = [
  { time: "2m ago", message: "Cabal cluster detected on DOGENAI — 5 wallets hold 22% supply", severity: "high" },
  { time: "8m ago", message: "Smart money convergence on SCILAB — 7 wallets DCA-ing", severity: "opportunity" },
  { time: "15m ago", message: "DEV drain velocity spiking on RUGDAO — 4.2%/hr removal rate", severity: "critical" },
  { time: "22m ago", message: "AI narrative rotating from BSC to Solana — 45% acceleration", severity: "info" },
  { time: "31m ago", message: "Conviction score dropped below 35 on held PEPEX position", severity: "warning" },
];

const tosColor = (score: number) => {
  if (score > 60) return "text-red-400";
  if (score > 30) return "text-yellow-400";
  return "text-emerald-400";
};

const tosBg = (score: number) => {
  if (score > 60) return "bg-red-400/10 border-red-400/20";
  if (score > 30) return "bg-yellow-400/10 border-yellow-400/20";
  return "bg-emerald-400/10 border-emerald-400/20";
};

const severityColor: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10",
  high: "text-orange-400 bg-orange-400/10",
  warning: "text-yellow-400 bg-yellow-400/10",
  opportunity: "text-emerald-400 bg-emerald-400/10",
  info: "text-primary bg-primary/10",
};

const Dashboard = () => {
  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient-primary">OPIS</span> Dashboard
          </h1>
          <p className="text-muted-foreground">Real-time threat & opportunity monitoring across 4 chains</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Eye, label: "Tokens Monitored", value: "2,847", change: "+124" },
            { icon: Shield, label: "Threats Active", value: "34", change: "+7" },
            { icon: TrendingUp, label: "Opportunities", value: "12", change: "+3" },
            { icon: Activity, label: "Alerts (24h)", value: "189", change: "+42" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="surface-glass rounded-xl p-4 opacity-0 animate-fade-up"
              style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: "forwards" }}
            >
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
          {/* Token TOS Feed */}
          <div className="lg:col-span-2 opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            <GlowingCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Live TOS Feed
                </h2>
                <span className="text-xs font-mono text-primary flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left pb-3 font-medium">Token</th>
                      <th className="text-left pb-3 font-medium">Chain</th>
                      <th className="text-center pb-3 font-medium">TOS</th>
                      <th className="text-center pb-3 font-medium">Cabal</th>
                      <th className="text-center pb-3 font-medium">Drain</th>
                      <th className="text-center pb-3 font-medium">Conv.</th>
                      <th className="text-center pb-3 font-medium">Narr.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTokens.map((token, i) => (
                      <tr
                        key={token.symbol}
                        className="border-b border-border/50 hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {token.polarity === "threat" ? (
                              <ArrowDownRight className="h-4 w-4 text-red-400" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                            )}
                            <span className="font-mono font-semibold text-foreground">{token.symbol}</span>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">{token.chain}</td>
                        <td className="py-3 text-center">
                          <span className={`font-mono font-bold text-sm px-2 py-1 rounded border ${tosBg(token.tos)} ${tosColor(token.tos)}`}>
                            {token.tos}
                          </span>
                        </td>
                        <td className={`py-3 text-center font-mono text-sm ${tosColor(token.cabal)}`}>{token.cabal}</td>
                        <td className={`py-3 text-center font-mono text-sm ${tosColor(token.drain)}`}>{token.drain}</td>
                        <td className={`py-3 text-center font-mono text-sm ${tosColor(token.conviction)}`}>{token.conviction}</td>
                        <td className={`py-3 text-center font-mono text-sm ${tosColor(token.narrative)}`}>{token.narrative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlowingCard>
          </div>

          {/* Alert Feed */}
          <div className="opacity-0 animate-fade-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
            <GlowingCard>
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Alert Stream
              </h2>
              <div className="space-y-4">
                {mockAlerts.map((alert, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase ${severityColor[alert.severity]}`}>
                      {alert.severity}
                    </div>
                    <div>
                      <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                      <span className="text-xs text-muted-foreground mt-1">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlowingCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
