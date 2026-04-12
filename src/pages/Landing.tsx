import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Eye, Shield, Brain, Globe, Zap, Target, Activity, ArrowRight, ChevronDown } from "lucide-react";
import heroImage from "@/assets/hero-eye.jpg";
import ParticleBackground from "@/components/ParticleBackground";
import StatTicker from "@/components/StatTicker";
import FeatureCard from "@/components/FeatureCard";
import GlowingCard from "@/components/GlowingCard";

const Landing = () => {
  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="OPIS predator intelligence"
            width={1920}
            height={1080}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-bg opacity-30 z-0" />

        {/* Scan line */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
            style={{ animation: "scan 8s linear infinite" }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-mono text-primary">AVE Claw Hackathon 2026</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6 opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            <span className="text-foreground">ON-CHAIN</span>
            <br />
            <span className="text-gradient-primary">PREDATOR</span>
            <br />
            <span className="text-foreground">INTELLIGENCE</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-up" style={{ animationDelay: "600ms", animationFillMode: "forwards" }}>
            Detect coordinated manipulation. Stalk smart money. Execute before the market reacts.
            Real-time quant signals across Solana, BSC, ETH & Base.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "800ms", animationFillMode: "forwards" }}>
            <Link to="/dashboard">
              <Button variant="hero" size="lg" className="text-base px-8 gap-2">
                <Zap className="h-5 w-5" />
                Launch Dashboard
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="hero-outline" size="lg" className="text-base px-8 gap-2">
                Learn More
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="opacity-0 animate-fade-up" style={{ animationDelay: "1200ms", animationFillMode: "forwards" }}>
            <ChevronDown className="h-8 w-8 text-muted-foreground mx-auto animate-float" />
          </div>
        </div>
      </section>

      {/* Stat Ticker */}
      <StatTicker />

      {/* 4 Signal Modules */}
      <section className="relative py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
              <span className="text-gradient-primary">4 Quant Signal</span> Modules
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Every module reads Ave.ai labels and turns them into quantitative scores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              icon={Eye}
              title="Cabal Fingerprinter"
              description="Cross-reference top 100 holders, build co-occurrence graphs, and score coordination probability using shared funding hops, timing, and hold ratios."
              delay={200}
            />
            <FeatureCard
              icon={Shield}
              title="DEV Drain Velocity"
              description="Detect slow-drain rug pulls by computing rolling liquidity removal velocity. Dynamic thresholds adapt based on token age, TVL, and risk score."
              delay={350}
            />
            <FeatureCard
              icon={Brain}
              title="Conviction Stack Scorer"
              description="Score smart wallet conviction per token — entry frequency, position sizing, hold duration through drawdowns, DCA behavior — then stack across wallets."
              delay={500}
            />
            <FeatureCard
              icon={Globe}
              title="Cross-Chain Narrative Radar"
              description="Monitor narrative volume acceleration across Solana, BSC, and ETH simultaneously. Surface rotation opportunities with 2-6 hour windows."
              delay={650}
            />
          </div>
        </div>
      </section>

      {/* TOS Engine Section */}
      <section className="relative py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="opacity-0 animate-slide-left" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                <span className="text-gradient-primary">TOS Engine</span>
                <br />
                Threat + Opportunity Score
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                All four modules feed into a single composite score from 0-100. The TOS engine determines signal polarity — is this a threat to exit, or an opportunity to enter?
              </p>
              <div className="space-y-4">
                {[
                  { range: "< 30", label: "Safe Zone", color: "bg-emerald-500" },
                  { range: "30-60", label: "Watch Zone", color: "bg-yellow-500" },
                  { range: "> 60", label: "Action Zone", color: "bg-red-500" },
                ].map((zone) => (
                  <div key={zone.range} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${zone.color}`} />
                    <span className="font-mono text-sm text-muted-foreground w-16">{zone.range}</span>
                    <span className="text-foreground font-medium">{zone.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="opacity-0 animate-slide-right" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
              <GlowingCard>
                <div className="font-mono text-sm space-y-2">
                  <div className="text-muted-foreground">// TOS Composition</div>
                  <div>
                    <span className="text-primary">TOS</span> = (
                    <span className="text-primary">Cabal</span>×0.30) + (
                    <span className="text-primary">Drain</span>×0.25)
                  </div>
                  <div className="pl-8">
                    + (<span className="text-primary">Conv</span>×0.30) + (
                    <span className="text-primary">Narr</span>×0.15)
                  </div>
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Polarity:</span>
                      <span className="text-primary">opportunity</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score:</span>
                      <span className="text-foreground font-bold text-lg">73.4</span>
                    </div>
                  </div>
                </div>
              </GlowingCard>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Trading Strategies */}
      <section className="relative py-24 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              <span className="text-gradient-primary">3 Autonomous</span> Strategies
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From signal detection to trade execution — fully automated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Threat Exit",
                subtitle: "Strategy A",
                description: "Auto-sell positions when TOS threat score crosses your threshold. MEV protection enabled.",
                trigger: "TOS Threat > 65",
              },
              {
                icon: Target,
                title: "Conviction Entry",
                subtitle: "Strategy B",
                description: "Enter tokens with high smart money conviction, low cabal risk, and healthy liquidity.",
                trigger: "Conviction > 65 & Cabal < 40",
              },
              {
                icon: Activity,
                title: "Narrative Ride",
                subtitle: "Strategy C",
                description: "Ride cross-chain narrative rotations with backtested win rates above 60%.",
                trigger: "Acceleration > 30%",
              },
            ].map((strat, i) => (
              <GlowingCard key={strat.title} className={`opacity-0 animate-fade-up`} style={{ animationDelay: `${200 + i * 150}ms`, animationFillMode: "forwards" } as React.CSSProperties}>
                <div className="text-xs font-mono text-primary mb-4">{strat.subtitle}</div>
                <strat.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">{strat.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{strat.description}</p>
                <div className="px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 inline-block">
                  <span className="text-xs font-mono text-primary">{strat.trigger}</span>
                </div>
              </GlowingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Chains Section */}
      <section className="relative py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12">
            Monitoring <span className="text-gradient-primary">4 Chains</span> Live
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {["Solana", "BSC", "Ethereum", "Base"].map((chain, i) => (
              <div
                key={chain}
                className="flex flex-col items-center gap-3 px-8 py-6 rounded-xl surface-glass hover:glow-border transition-all duration-300 opacity-0 animate-fade-up"
                style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: "forwards" }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <span className="font-semibold text-foreground">{chain}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-6">
            See the <span className="text-gradient-primary">predators</span> before they see you.
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join the intelligence revolution. Real-time on-chain threat detection is here.
          </p>
          <Link to="/dashboard">
            <Button variant="hero" size="lg" className="text-base px-10 gap-2">
              <Eye className="h-5 w-5" />
              Enter OPIS
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <span className="font-mono font-bold text-primary">OPIS</span>
            <span className="text-sm text-muted-foreground">© 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link to="/signals" className="hover:text-foreground transition-colors">Signals</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
