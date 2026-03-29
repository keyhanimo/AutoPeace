import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Activity, Zap, BarChart, ShieldAlert, Database } from "lucide-react";
import { useGetExperimentStats, useGetLatestForecasts, type Forecast } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";

function calculatePeaceProbability(forecasts: Forecast[]): number {
  if (!forecasts || forecasts.length === 0) return 0;
  const f30 = forecasts.find(f => f.timeHorizon === '30d') ?? forecasts[0];
  if (!f30) return 0;
  const p = f30.probabilities;
  const peacefulOutcomes = [
    p.humanitarian_mini_deal ?? 0,
    p.sanctions_partial_deal ?? 0,
    p.regional_framework ?? 0,
    p.broad_settlement ?? 0,
  ];
  return peacefulOutcomes.reduce((a, b) => a + b, 0) * 100;
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetExperimentStats();
  const { data: latestRes, isLoading: forecastLoading } = useGetLatestForecasts();
  
  const forecasts = latestRes?.data || [];
  const peaceProb = calculatePeaceProbability(forecasts);
  
  // Quick hack for circle math
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (peaceProb / 100) * circumference;

  return (
    <div className="space-y-12 animate-fade-in pb-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden border border-border/50 bg-card">
        <div className="absolute inset-0 pointer-events-none">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
        
        <div className="relative z-10 p-8 md:p-16 lg:p-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="bg-background/50 backdrop-blur-md border-primary/30 text-primary">
              Live AI Geopolitical Analysis
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-display leading-tight">
              Forecasting <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Peace & Conflict</span> in Real-Time.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
              AutoPeace uses continuous multi-agent LLM loops to analyze thousands of data points, forecasting outcomes for the Iran conflict with calibrated probabilistic precision.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/forecasts">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  View Latest Forecasts <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/methodology">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-background/50 backdrop-blur-sm">
                  Read Methodology
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex justify-center items-center">
            <div className="relative w-72 h-72">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 280 280">
                <circle cx="140" cy="140" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                {!forecastLoading && (
                  <motion.circle 
                    cx="140" cy="140" r={radius} 
                    stroke="currentColor" 
                    strokeWidth="12" 
                    fill="transparent" 
                    className="text-primary drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Peace Outlook</div>
                <div className="text-5xl font-display font-bold text-foreground">
                  {forecastLoading ? "--" : peaceProb.toFixed(1)}<span className="text-2xl text-muted-foreground">%</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2 px-4 py-1 bg-secondary rounded-full">30-Day Horizon</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Latest Brier Score</p>
          <h3 className="text-3xl font-display font-bold">
            {statsLoading ? "--" : stats?.latestBrierScore?.toFixed(3) || "N/A"}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">Lower is better (0 = perfect)</p>
        </Card>
        
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Database className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Research Cycles</p>
          <h3 className="text-3xl font-display font-bold">
            {statsLoading ? "--" : stats?.cyclesRun}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">Continuous loops executed</p>
        </Card>
        
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Zap className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Experiments Retained</p>
          <h3 className="text-3xl font-display font-bold">
            {statsLoading ? "--" : `${(stats?.retentionRate || 0) * 100}%`}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">{stats?.retained} of {stats?.total} retained</p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <BarChart className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Tokens Processed</p>
          <h3 className="text-3xl font-display font-bold">
            {statsLoading ? "--" : new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(stats?.totalTokensConsumed || 0)}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">Total LLM context analyzed</p>
        </Card>
      </section>

      {/* How it works */}
      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-display">Intelligence Pipeline</h2>
          <p className="text-muted-foreground mt-1">How AutoPeace turns global noise into calibrated signal.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-border via-primary/50 to-border" />
          
          <Card className="p-8 relative">
            <div className="w-12 h-12 rounded-full bg-secondary border-2 border-primary flex items-center justify-center mb-6 relative z-10 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="font-bold text-lg">1</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Evidence Ingestion</h3>
            <p className="text-muted-foreground text-sm">
              We continuously scrape ACLED, GDELT, and global news feeds, filtering for relevance to 28 key stakeholders in the Iran conflict theater.
            </p>
          </Card>
          
          <Card className="p-8 relative">
            <div className="w-12 h-12 rounded-full bg-secondary border-2 border-primary flex items-center justify-center mb-6 relative z-10 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="font-bold text-lg">2</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Cross-Model Red Teaming</h3>
            <p className="text-muted-foreground text-sm">
              Anthropic generates initial Bayesian forecasts. Gemini aggressively critiques them. OpenAI evaluates the critique. The forecast updates.
            </p>
          </Card>

          <Card className="p-8 relative">
            <div className="w-12 h-12 rounded-full bg-secondary border-2 border-primary flex items-center justify-center mb-6 relative z-10 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="font-bold text-lg">3</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Evolution & Scoring</h3>
            <p className="text-muted-foreground text-sm">
              The agent mutates its own prompt instructions. If a mutated prompt produces better backtested Brier scores, the new prompt is retained forever.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
