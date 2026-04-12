const stats = [
  "🔍 142 Cabal Clusters Detected Today",
  "⚡ 23 DEV Drain Alerts Fired",
  "🧠 89 Smart Money Convergences",
  "🌐 7 Cross-Chain Rotations Tracked",
  "📊 $2.4M Threat Value Identified",
  "🎯 67% Conviction Entry Win Rate",
  "🛡️ 34 Rug Pulls Avoided",
  "🔗 4 Chains Monitored Live",
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
