import { Eye, Shield, Brain, Globe, Zap, ArrowRight, Database, Cpu, Layers } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import ParticleBackground from "@/components/ParticleBackground";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen pt-20 relative">
      <ParticleBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <h1 className="text-4xl sm:text-6xl font-bold mb-4">
            What is <span className="text-gradient-primary">OPIS</span>?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            On-Chain Predator Intelligence System — a monitoring-first quant intelligence platform that runs continuously on real AVE data and fires live WSS-driven signals.
          </p>
        </div>

        {/* Problem */}
        <div className="mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
          <h2 className="text-2xl font-bold mb-6 text-foreground">The Problem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Cabal Manipulation", desc: "Coordinated wallets pump tokens silently. Retail buys the spike. Cabal exits." },
              { title: "DEV Slow-Drains", desc: "Sophisticated rugs remove 2-4% liquidity at a time. Each event looks normal. 60% gone before anyone notices." },
              { title: "Signal Dilution", desc: "Raw smart money copy trading is naive. One buy might be a hedge. Five high-conviction DCA entries is signal." },
              { title: "Rotation Lag", desc: "Narratives that pump on BSC follow on Solana within 2-6 hours. Nobody automates the detection." },
              { title: "Wash Volume Spoofing", desc: "Circular wallet loops can fake activity and trap momentum traders into low-quality volume." },
              { title: "Hidden Momentum Divergence", desc: "Price can rise while smart money exits and LP quality decays — classic late distribution." },
            ].map((problem, i) => (
              <div key={problem.title} className="surface-glass rounded-xl p-5 border border-border hover:border-primary/30 transition-all">
                <h3 className="font-semibold text-foreground mb-2">{problem.title}</h3>
                <p className="text-sm text-muted-foreground">{problem.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture */}
        <div className="mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Architecture</h2>
          <GlowingCard>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Database, label: "Ingestion Layer", desc: "REST + WSS streams" },
                { icon: Cpu, label: "5 Core Models", desc: "Cabal, Drain, Conviction, Narrative, DCA" },
                { icon: Layers, label: "3 Advanced Monitors", desc: "Wash, Retention, Divergence" },
                { icon: Zap, label: "TOS + Signal Stream", desc: "Composite scoring + live signal feed" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">{item.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <div className="font-mono text-xs text-muted-foreground text-center">
                Ave Data API + WSS → Ingestion → 5 Core Models + 3 Advanced Monitors → TOS → Live Signals
              </div>
            </div>
          </GlowingCard>
        </div>

        <div className="mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "350ms", animationFillMode: "forwards" }}>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Monitoring Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Threat Stack", desc: "Cabal, DEV Drain, Wash Detector, and Divergence catch coordinated exits and manipulated volume in real time." },
              { icon: Brain, title: "Opportunity Stack", desc: "Conviction, DCA, Narrative, and Retention surface high-quality continuation setups instead of isolated spikes." },
              { icon: Globe, title: "Live Composite Layer", desc: "TOS unifies directional pressure while preserving every module score for explainable signal decisions." },
            ].map((item) => (
              <div key={item.title} className="surface-glass rounded-xl p-5 border border-border hover:border-primary/30 transition-all">
                <item.icon className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Tech Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "React + TypeScript",
              "Node.js Backend",
              "PostgreSQL / Supabase",
              "Ave Data API",
              "AVE WSS (liq/tx/multi_tx)",
              "SSE Signal Streaming",
              "Quant Model Engine (TypeScript)",
              "Watchlist Persistence + Trade Logs",
              "Optional AVE Trading Skill",
            ].map((tech) => (
              <div key={tech} className="surface-glass rounded-lg px-4 py-3 text-sm font-mono text-muted-foreground text-center hover:text-foreground hover:glow-border transition-all">
                {tech}
              </div>
            ))}
          </div>
        </div>

        {/* Hackathon */}
        <div className="mb-16 opacity-0 animate-fade-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
          <GlowingCard>
            <div className="text-center">
              <div className="text-xs font-mono text-primary mb-2">AVE CLAW HACKATHON 2026</div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Built for HK Web3 Festival</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Complete Application Track — monitoring-first system with continuous quant scoring and optional signal-to-trade execution.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <div>
                  <div className="text-2xl font-bold text-primary font-mono">93</div>
                  <div className="text-xs text-muted-foreground">Innovation</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary font-mono">90</div>
                  <div className="text-xs text-muted-foreground">Technical</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary font-mono">90</div>
                  <div className="text-xs text-muted-foreground">Real-World</div>
                </div>
              </div>
            </div>
          </GlowingCard>
        </div>

        {/* CTA */}
        <div className="text-center opacity-0 animate-fade-up" style={{ animationDelay: "600ms", animationFillMode: "forwards" }}>
          <Link to="/dashboard">
            <Button variant="hero" size="lg" className="gap-2">
              <Eye className="h-5 w-5" />
              Explore Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;
