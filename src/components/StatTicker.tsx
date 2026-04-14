const stats = [
  "🔍 5 Core Quant Models Active",
  "⚡ WSS live signal stream across all watchlist tokens",
  "🌊 Wash detector flags circular flow manipulation",
  "🕒 Holder retention tracker benchmarks cohort stickiness",
  "📈 Momentum divergence catches price-vs-health decoupling",
  "🧠 Conviction + DCA stack surfaces real accumulation",
  "🛡️ TOS composite ranks threat vs opportunity in real time",
  "🔗 4 chains monitored continuously with zero frontend polling",
];

const StatTicker = () => {
  return (
    <div className="overflow-hidden border-y border-border bg-card/50 py-3">
      <div className="flex animate-ticker whitespace-nowrap">
        {[...stats, ...stats].map((stat, i) => (
          <span
            key={i}
            className="mx-8 text-sm font-mono text-muted-foreground"
          >
            {stat}
          </span>
        ))}
      </div>
    </div>
  );
};

export default StatTicker;
