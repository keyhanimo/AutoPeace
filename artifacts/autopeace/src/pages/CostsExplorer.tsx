import React, { useState, useMemo } from "react";
import { PageHeader, Card, Badge } from "@/components/ui";
import {
  TrendingUp, Shield, HeartPulse, Ship, Plane, Factory,
  Banknote, Zap, ChevronDown, ChevronUp, ArrowRight, Scale, Globe, BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
} from "recharts";

function fmtB(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}T`;
  if (Math.abs(v) >= 1) return `$${v.toFixed(1)}B`;
  if (Math.abs(v) >= 0.01) return `$${(v * 1000).toFixed(0)}M`;
  return `$${(v * 1000000).toFixed(0)}K`;
}

function fmtNum(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}

const CHANNELS = [
  { id: "trade", label: "Trade & Sanctions", icon: Factory, color: "#ef4444", description: "Bilateral trade barriers, export controls, sanctions friction" },
  { id: "energy", label: "Energy Markets", icon: Zap, color: "#f59e0b", description: "Oil/LNG price risk, Hormuz chokepoint, supply disruption" },
  { id: "shipping", label: "Shipping & Insurance", icon: Ship, color: "#06b6d4", description: "War-risk insurance, rerouting costs, freight rate spikes" },
  { id: "finance", label: "Finance & Banking", icon: Banknote, color: "#8b5cf6", description: "Sovereign spreads, capital costs, payment frictions" },
  { id: "aviation", label: "Aviation & Tourism", icon: Plane, color: "#ec4899", description: "Airspace closures, tourism losses, business travel" },
  { id: "security", label: "Defense & Security", icon: Shield, color: "#64748b", description: "Conflict-specific military premium above deterrence floor" },
  { id: "humanitarian", label: "Humanitarian", icon: HeartPulse, color: "#f97316", description: "Refugees, displacement, health burden, aid costs" },
  { id: "productivity", label: "Productivity & FDI", icon: TrendingUp, color: "#10b981", description: "Technology access, investment confidence, integration gains" },
] as const;

type ChannelId = typeof CHANNELS[number]["id"];

interface StakeholderCBA {
  id: string;
  name: string;
  flag: string;
  region: string;
  gdpB: number;
  warCostB: number;
  peaceBenefitB: number;
  netSwingB: number;
  warCostPctGdp: number;
  channels: Record<ChannelId, { warCost: number; peaceBenefit: number }>;
  keyFacts: string[];
  displaced: number;
  casualties: number;
}

const STAKEHOLDERS: StakeholderCBA[] = [
  {
    id: "iran", name: "Iran", flag: "🇮🇷", region: "Core Principal", gdpB: 401,
    warCostB: 87.5, peaceBenefitB: 142.0, netSwingB: 229.5, warCostPctGdp: 21.8,
    channels: {
      trade: { warCost: 28.0, peaceBenefit: 45.0 },
      energy: { warCost: 18.5, peaceBenefit: 32.0 },
      shipping: { warCost: 3.2, peaceBenefit: 4.5 },
      finance: { warCost: 12.0, peaceBenefit: 22.0 },
      aviation: { warCost: 4.8, peaceBenefit: 8.5 },
      security: { warCost: 8.5, peaceBenefit: 6.0 },
      humanitarian: { warCost: 6.5, peaceBenefit: 5.0 },
      productivity: { warCost: 6.0, peaceBenefit: 19.0 },
    },
    keyFacts: ["$200B+ cumulative sanctions cost since 2018", "Oil exports constrained to ~1.5M bbl/day vs 2.5M potential", "Banking system cut off from SWIFT"],
    displaced: 0, casualties: 1200,
  },
  {
    id: "us", name: "United States", flag: "🇺🇸", region: "Core Principal", gdpB: 28780,
    warCostB: 52.0, peaceBenefitB: 38.0, netSwingB: 90.0, warCostPctGdp: 0.18,
    channels: {
      trade: { warCost: 4.0, peaceBenefit: 6.0 },
      energy: { warCost: 8.5, peaceBenefit: 5.0 },
      shipping: { warCost: 2.0, peaceBenefit: 2.5 },
      finance: { warCost: 5.0, peaceBenefit: 4.0 },
      aviation: { warCost: 1.5, peaceBenefit: 2.0 },
      security: { warCost: 25.0, peaceBenefit: 12.0 },
      humanitarian: { warCost: 2.0, peaceBenefit: 1.5 },
      productivity: { warCost: 4.0, peaceBenefit: 5.0 },
    },
    keyFacts: ["$25B/yr Iran-linked military deployment cost", "CENTCOM operational tempo at multi-year high", "Sanctions enforcement budget ~$1.2B/yr"],
    displaced: 0, casualties: 45,
  },
  {
    id: "israel", name: "Israel", flag: "🇮🇱", region: "Core Principal", gdpB: 539,
    warCostB: 43.0, peaceBenefitB: 35.0, netSwingB: 78.0, warCostPctGdp: 8.0,
    channels: {
      trade: { warCost: 5.0, peaceBenefit: 6.0 },
      energy: { warCost: 3.5, peaceBenefit: 2.5 },
      shipping: { warCost: 2.5, peaceBenefit: 2.0 },
      finance: { warCost: 6.0, peaceBenefit: 8.0 },
      aviation: { warCost: 4.0, peaceBenefit: 5.0 },
      security: { warCost: 15.0, peaceBenefit: 6.0 },
      humanitarian: { warCost: 3.0, peaceBenefit: 2.0 },
      productivity: { warCost: 4.0, peaceBenefit: 3.5 },
    },
    keyFacts: ["Reserve mobilization costs ~$1.5B/month at peak", "Tourism receipts down 40%", "Sovereign CDS spread doubled since 2023"],
    displaced: 200000, casualties: 1200,
  },
  {
    id: "saudi_arabia", name: "Saudi Arabia", flag: "🇸🇦", region: "Gulf State", gdpB: 1108,
    warCostB: 18.5, peaceBenefitB: 28.0, netSwingB: 46.5, warCostPctGdp: 1.7,
    channels: {
      trade: { warCost: 2.0, peaceBenefit: 5.0 },
      energy: { warCost: -4.0, peaceBenefit: -6.0 },
      shipping: { warCost: 3.5, peaceBenefit: 4.0 },
      finance: { warCost: 4.0, peaceBenefit: 8.0 },
      aviation: { warCost: 3.0, peaceBenefit: 5.0 },
      security: { warCost: 6.0, peaceBenefit: 4.0 },
      humanitarian: { warCost: 2.0, peaceBenefit: 3.0 },
      productivity: { warCost: 2.0, peaceBenefit: 5.0 },
    },
    keyFacts: ["Vision 2030 investment dampened by regional risk", "Benefits from higher oil prices (transfer, not efficiency)", "Airspace rerouting adds 2-3hr to some flights"],
    displaced: 0, casualties: 0,
  },
  {
    id: "uae", name: "UAE", flag: "🇦🇪", region: "Gulf State", gdpB: 509,
    warCostB: 14.0, peaceBenefitB: 22.0, netSwingB: 36.0, warCostPctGdp: 2.8,
    channels: {
      trade: { warCost: 2.5, peaceBenefit: 5.5 },
      energy: { warCost: -1.5, peaceBenefit: -2.0 },
      shipping: { warCost: 4.0, peaceBenefit: 5.0 },
      finance: { warCost: 3.0, peaceBenefit: 5.0 },
      aviation: { warCost: 3.0, peaceBenefit: 4.5 },
      security: { warCost: 1.5, peaceBenefit: 1.0 },
      humanitarian: { warCost: 0.5, peaceBenefit: 0.5 },
      productivity: { warCost: 1.0, peaceBenefit: 2.5 },
    },
    keyFacts: ["Dubai logistics hub disrupted by Hormuz risk", "War-risk insurance up 300%+", "Aviation rerouting costs ~$3B/yr"],
    displaced: 0, casualties: 0,
  },
  {
    id: "europe", name: "Europe (EU+UK)", flag: "🇪🇺", region: "Major External", gdpB: 19800,
    warCostB: 42.0, peaceBenefitB: 55.0, netSwingB: 97.0, warCostPctGdp: 0.21,
    channels: {
      trade: { warCost: 8.0, peaceBenefit: 12.0 },
      energy: { warCost: 14.0, peaceBenefit: 15.0 },
      shipping: { warCost: 6.0, peaceBenefit: 8.0 },
      finance: { warCost: 5.0, peaceBenefit: 7.0 },
      aviation: { warCost: 3.0, peaceBenefit: 4.0 },
      security: { warCost: 3.0, peaceBenefit: 2.0 },
      humanitarian: { warCost: 2.0, peaceBenefit: 3.0 },
      productivity: { warCost: 1.0, peaceBenefit: 4.0 },
    },
    keyFacts: ["LNG price premium ~$2-4/MMBtu from Hormuz risk", "Sanctions compliance cost ~$5B/yr across EU", "Mediterranean shipping rerouted from Suez disruption"],
    displaced: 0, casualties: 0,
  },
  {
    id: "china", name: "China", flag: "🇨🇳", region: "Major External", gdpB: 17960,
    warCostB: 35.0, peaceBenefitB: 48.0, netSwingB: 83.0, warCostPctGdp: 0.19,
    channels: {
      trade: { warCost: 6.0, peaceBenefit: 10.0 },
      energy: { warCost: 15.0, peaceBenefit: 18.0 },
      shipping: { warCost: 5.0, peaceBenefit: 7.0 },
      finance: { warCost: 3.0, peaceBenefit: 5.0 },
      aviation: { warCost: 1.0, peaceBenefit: 2.0 },
      security: { warCost: 1.0, peaceBenefit: 0.5 },
      humanitarian: { warCost: 0.5, peaceBenefit: 0.5 },
      productivity: { warCost: 3.5, peaceBenefit: 5.0 },
    },
    keyFacts: ["Imports ~1.5M bbl/day through Hormuz", "BRI infrastructure projects at risk", "Major buyer of sanctioned Iranian oil at discount"],
    displaced: 0, casualties: 0,
  },
  {
    id: "india", name: "India", flag: "🇮🇳", region: "Major External", gdpB: 3940,
    warCostB: 22.0, peaceBenefitB: 30.0, netSwingB: 52.0, warCostPctGdp: 0.56,
    channels: {
      trade: { warCost: 3.0, peaceBenefit: 5.0 },
      energy: { warCost: 10.0, peaceBenefit: 12.0 },
      shipping: { warCost: 4.0, peaceBenefit: 5.0 },
      finance: { warCost: 2.0, peaceBenefit: 3.0 },
      aviation: { warCost: 1.0, peaceBenefit: 2.0 },
      security: { warCost: 0.5, peaceBenefit: 0.5 },
      humanitarian: { warCost: 0.5, peaceBenefit: 0.5 },
      productivity: { warCost: 1.0, peaceBenefit: 2.0 },
    },
    keyFacts: ["3rd largest oil importer, heavy Hormuz dependence", "Chabahar port project stalled", "Fertilizer import costs up 25%"],
    displaced: 0, casualties: 0,
  },
  {
    id: "japan_korea", name: "Japan + South Korea", flag: "🇯🇵", region: "Major External", gdpB: 7200,
    warCostB: 28.0, peaceBenefitB: 32.0, netSwingB: 60.0, warCostPctGdp: 0.39,
    channels: {
      trade: { warCost: 3.0, peaceBenefit: 4.0 },
      energy: { warCost: 14.0, peaceBenefit: 15.0 },
      shipping: { warCost: 5.0, peaceBenefit: 6.0 },
      finance: { warCost: 2.0, peaceBenefit: 3.0 },
      aviation: { warCost: 1.0, peaceBenefit: 1.5 },
      security: { warCost: 1.5, peaceBenefit: 1.0 },
      humanitarian: { warCost: 0.5, peaceBenefit: 0.5 },
      productivity: { warCost: 1.0, peaceBenefit: 1.0 },
    },
    keyFacts: ["~80% of oil imports transit Hormuz", "LNG supply contracts at risk", "Insurance premiums tripled for Gulf-bound vessels"],
    displaced: 0, casualties: 0,
  },
  {
    id: "iraq", name: "Iraq", flag: "🇮🇶", region: "Regional Spillover", gdpB: 264,
    warCostB: 12.0, peaceBenefitB: 15.0, netSwingB: 27.0, warCostPctGdp: 4.5,
    channels: {
      trade: { warCost: 2.5, peaceBenefit: 4.0 },
      energy: { warCost: -1.0, peaceBenefit: -1.5 },
      shipping: { warCost: 1.5, peaceBenefit: 2.0 },
      finance: { warCost: 2.0, peaceBenefit: 3.0 },
      aviation: { warCost: 1.0, peaceBenefit: 1.5 },
      security: { warCost: 3.0, peaceBenefit: 2.0 },
      humanitarian: { warCost: 2.0, peaceBenefit: 2.0 },
      productivity: { warCost: 1.0, peaceBenefit: 2.0 },
    },
    keyFacts: ["Direct spillover conflict risk", "Trade corridor to Iran disrupted", "2M+ internal displacement linked to proxy conflicts"],
    displaced: 2000000, casualties: 3500,
  },
  {
    id: "turkey", name: "Turkey", flag: "🇹🇷", region: "Regional Spillover", gdpB: 1108,
    warCostB: 10.0, peaceBenefitB: 16.0, netSwingB: 26.0, warCostPctGdp: 0.9,
    channels: {
      trade: { warCost: 2.5, peaceBenefit: 4.5 },
      energy: { warCost: 3.0, peaceBenefit: 4.0 },
      shipping: { warCost: 1.0, peaceBenefit: 1.5 },
      finance: { warCost: 1.5, peaceBenefit: 2.5 },
      aviation: { warCost: 0.5, peaceBenefit: 1.0 },
      security: { warCost: 1.0, peaceBenefit: 0.5 },
      humanitarian: { warCost: 0.5, peaceBenefit: 1.0 },
      productivity: { warCost: 0.0, peaceBenefit: 1.0 },
    },
    keyFacts: ["Key trade corridor and intermediary", "Refugee spillover costs ~$2B/yr", "Reconstruction contracts potential under peace"],
    displaced: 0, casualties: 0,
  },
  {
    id: "lebanon", name: "Lebanon", flag: "🇱🇧", region: "Regional Spillover", gdpB: 22,
    warCostB: 8.5, peaceBenefitB: 6.0, netSwingB: 14.5, warCostPctGdp: 38.6,
    channels: {
      trade: { warCost: 0.5, peaceBenefit: 1.0 },
      energy: { warCost: 0.5, peaceBenefit: 0.5 },
      shipping: { warCost: 0.5, peaceBenefit: 0.5 },
      finance: { warCost: 2.0, peaceBenefit: 1.5 },
      aviation: { warCost: 0.5, peaceBenefit: 0.5 },
      security: { warCost: 1.5, peaceBenefit: 0.5 },
      humanitarian: { warCost: 2.0, peaceBenefit: 1.0 },
      productivity: { warCost: 1.0, peaceBenefit: 0.5 },
    },
    keyFacts: ["Direct conflict damage to infrastructure", "Sovereign default deepened by war", "1.5M Syrian refugees + new displacement"],
    displaced: 1500000, casualties: 2800,
  },
  {
    id: "yemen", name: "Yemen", flag: "🇾🇪", region: "Regional Spillover", gdpB: 22,
    warCostB: 6.0, peaceBenefitB: 4.0, netSwingB: 10.0, warCostPctGdp: 27.3,
    channels: {
      trade: { warCost: 0.5, peaceBenefit: 0.5 },
      energy: { warCost: 0.3, peaceBenefit: 0.3 },
      shipping: { warCost: 1.5, peaceBenefit: 1.0 },
      finance: { warCost: 0.2, peaceBenefit: 0.2 },
      aviation: { warCost: 0.5, peaceBenefit: 0.5 },
      security: { warCost: 1.0, peaceBenefit: 0.5 },
      humanitarian: { warCost: 2.0, peaceBenefit: 1.0 },
      productivity: { warCost: 0.0, peaceBenefit: 0.0 },
    },
    keyFacts: ["Red Sea / Bab el-Mandeb disruption", "21M people need humanitarian aid", "Infrastructure largely destroyed"],
    displaced: 4500000, casualties: 5000,
  },
  {
    id: "egypt", name: "Egypt", flag: "🇪🇬", region: "Regional Spillover", gdpB: 395,
    warCostB: 8.0, peaceBenefitB: 12.0, netSwingB: 20.0, warCostPctGdp: 2.0,
    channels: {
      trade: { warCost: 1.0, peaceBenefit: 2.0 },
      energy: { warCost: 2.0, peaceBenefit: 2.5 },
      shipping: { warCost: 2.5, peaceBenefit: 3.5 },
      finance: { warCost: 1.0, peaceBenefit: 1.5 },
      aviation: { warCost: 0.5, peaceBenefit: 1.0 },
      security: { warCost: 0.5, peaceBenefit: 0.5 },
      humanitarian: { warCost: 0.5, peaceBenefit: 0.5 },
      productivity: { warCost: 0.0, peaceBenefit: 0.5 },
    },
    keyFacts: ["Suez Canal revenue at risk from rerouting", "Tourism down 15% from regional instability", "Energy import burden increased $2B/yr"],
    displaced: 0, casualties: 0,
  },
  {
    id: "qatar", name: "Qatar", flag: "🇶🇦", region: "Gulf State", gdpB: 219,
    warCostB: 6.0, peaceBenefitB: 10.0, netSwingB: 16.0, warCostPctGdp: 2.7,
    channels: {
      trade: { warCost: 0.5, peaceBenefit: 1.0 },
      energy: { warCost: -1.0, peaceBenefit: -2.0 },
      shipping: { warCost: 2.0, peaceBenefit: 3.0 },
      finance: { warCost: 1.5, peaceBenefit: 3.0 },
      aviation: { warCost: 1.5, peaceBenefit: 2.5 },
      security: { warCost: 0.5, peaceBenefit: 0.5 },
      humanitarian: { warCost: 0.5, peaceBenefit: 0.5 },
      productivity: { warCost: 0.5, peaceBenefit: 1.5 },
    },
    keyFacts: ["LNG price premium benefits Qatar (transfer)", "Aviation hub disrupted by airspace closures", "Diplomacy broker with mediation leverage"],
    displaced: 0, casualties: 0,
  },
  {
    id: "pakistan", name: "Pakistan", flag: "🇵🇰", region: "Regional Spillover", gdpB: 374,
    warCostB: 7.0, peaceBenefitB: 9.0, netSwingB: 16.0, warCostPctGdp: 1.9,
    channels: {
      trade: { warCost: 1.0, peaceBenefit: 2.0 },
      energy: { warCost: 3.0, peaceBenefit: 3.5 },
      shipping: { warCost: 1.0, peaceBenefit: 1.5 },
      finance: { warCost: 1.0, peaceBenefit: 1.0 },
      aviation: { warCost: 0.5, peaceBenefit: 0.5 },
      security: { warCost: 0.5, peaceBenefit: 0.5 },
      humanitarian: { warCost: 0.0, peaceBenefit: 0.0 },
      productivity: { warCost: 0.0, peaceBenefit: 0.0 },
    },
    keyFacts: ["Iran-Pakistan pipeline stalled by sanctions", "Energy import costs up $3B/yr", "Hosting Iran talks as regional mediator"],
    displaced: 0, casualties: 0,
  },
  {
    id: "jordan", name: "Jordan", flag: "🇯🇴", region: "Regional Spillover", gdpB: 50,
    warCostB: 4.0, peaceBenefitB: 5.0, netSwingB: 9.0, warCostPctGdp: 8.0,
    channels: {
      trade: { warCost: 0.5, peaceBenefit: 1.0 },
      energy: { warCost: 1.0, peaceBenefit: 1.0 },
      shipping: { warCost: 0.3, peaceBenefit: 0.3 },
      finance: { warCost: 0.5, peaceBenefit: 0.5 },
      aviation: { warCost: 0.2, peaceBenefit: 0.5 },
      security: { warCost: 0.5, peaceBenefit: 0.2 },
      humanitarian: { warCost: 1.0, peaceBenefit: 1.0 },
      productivity: { warCost: 0.0, peaceBenefit: 0.5 },
    },
    keyFacts: ["Hosts 1.3M Syrian refugees", "Trade corridors disrupted", "Tourism down 20% from regional risk"],
    displaced: 0, casualties: 0,
  },
  {
    id: "global_south_importers", name: "Global South (Importers)", flag: "🌍", region: "Global", gdpB: 15000,
    warCostB: 45.0, peaceBenefitB: 55.0, netSwingB: 100.0, warCostPctGdp: 0.3,
    channels: {
      trade: { warCost: 5.0, peaceBenefit: 8.0 },
      energy: { warCost: 20.0, peaceBenefit: 22.0 },
      shipping: { warCost: 10.0, peaceBenefit: 12.0 },
      finance: { warCost: 3.0, peaceBenefit: 4.0 },
      aviation: { warCost: 2.0, peaceBenefit: 3.0 },
      security: { warCost: 1.0, peaceBenefit: 1.0 },
      humanitarian: { warCost: 2.0, peaceBenefit: 2.0 },
      productivity: { warCost: 2.0, peaceBenefit: 3.0 },
    },
    keyFacts: ["Fuel and fertilizer import burden up 15-25%", "Inflation pass-through 1-2% in vulnerable economies", "Food security at risk for 200M+ people"],
    displaced: 0, casualties: 0,
  },
];

const GLOBAL_WAR_COST_B = STAKEHOLDERS.reduce((s, sh) => s + sh.warCostB, 0);
const GLOBAL_PEACE_BENEFIT_B = STAKEHOLDERS.reduce((s, sh) => s + sh.peaceBenefitB, 0);
const GLOBAL_NET_SWING_B = GLOBAL_WAR_COST_B + GLOBAL_PEACE_BENEFIT_B;
const TOTAL_DISPLACED = STAKEHOLDERS.reduce((s, sh) => s + sh.displaced, 0);
const TOTAL_CASUALTIES = STAKEHOLDERS.reduce((s, sh) => s + sh.casualties, 0);

const GLOBAL_CHANNEL_DATA = CHANNELS.map(ch => {
  const warCost = STAKEHOLDERS.reduce((s, sh) => s + Math.max(0, sh.channels[ch.id].warCost), 0);
  const peaceBenefit = STAKEHOLDERS.reduce((s, sh) => s + Math.max(0, sh.channels[ch.id].peaceBenefit), 0);
  return { ...ch, warCost, peaceBenefit };
});

type SortKey = "warCostB" | "peaceBenefitB" | "netSwingB" | "warCostPctGdp";

function GlobalSummaryCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-5 border-l-4 border-l-red-500">
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Annual War Cost</div>
        <div className="text-2xl font-bold font-mono text-red-400">{fmtB(GLOBAL_WAR_COST_B)}</div>
        <div className="text-xs text-muted-foreground mt-1">Global GDP-equivalent loss/yr</div>
      </Card>
      <Card className="p-5 border-l-4 border-l-emerald-500">
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Annual Peace Benefit</div>
        <div className="text-2xl font-bold font-mono text-emerald-400">{fmtB(GLOBAL_PEACE_BENEFIT_B)}</div>
        <div className="text-xs text-muted-foreground mt-1">GDP-equivalent gain if peace</div>
      </Card>
      <Card className="p-5 border-l-4 border-l-amber-500">
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Total Swing (War vs Peace)</div>
        <div className="text-2xl font-bold font-mono text-amber-400">{fmtB(GLOBAL_NET_SWING_B)}</div>
        <div className="text-xs text-muted-foreground mt-1">Annual difference, peace minus war</div>
      </Card>
      <Card className="p-5 border-l-4 border-l-purple-500">
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">5-Year Cumulative Swing</div>
        <div className="text-2xl font-bold font-mono text-purple-400">{fmtB(GLOBAL_NET_SWING_B * 5)}</div>
        <div className="text-xs text-muted-foreground mt-1">Peace vs war over 5 years</div>
      </Card>
    </div>
  );
}

function HumanitarianBanner() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="flex items-center gap-4 px-5 py-4 bg-card border border-border/50 rounded-sm">
        <HeartPulse className="w-8 h-8 text-orange-400 shrink-0" />
        <div>
          <div className="text-xl font-bold font-mono text-orange-400">{fmtNum(TOTAL_DISPLACED)}</div>
          <div className="text-xs text-muted-foreground">People displaced by conflict</div>
        </div>
      </div>
      <div className="flex items-center gap-4 px-5 py-4 bg-card border border-border/50 rounded-sm">
        <Shield className="w-8 h-8 text-red-400 shrink-0" />
        <div>
          <div className="text-xl font-bold font-mono text-red-400">{fmtNum(TOTAL_CASUALTIES)}</div>
          <div className="text-xs text-muted-foreground">Estimated casualties</div>
        </div>
      </div>
    </div>
  );
}

function ChannelBreakdownChart() {
  const data = GLOBAL_CHANNEL_DATA.map(ch => ({
    name: ch.label.split(" & ")[0].split(" (")[0],
    warCost: ch.warCost,
    peaceBenefit: ch.peaceBenefit,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-primary" />
        Channel-by-Channel Decomposition
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Annual global impact by economic channel (USD billions). War costs shown in red, peace benefits in green.</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'USD Billions', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' }, offset: 0 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              formatter={(v: number, name: string) => [`$${v.toFixed(1)}B`, name === 'warCost' ? 'War Cost' : 'Peace Benefit']}
            />
            <Legend formatter={(v: string) => v === 'warCost' ? 'War Cost' : 'Peace Benefit'} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="warCost" fill="#ef4444" radius={[2, 2, 0, 0]} />
            <Bar dataKey="peaceBenefit" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ChannelCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {GLOBAL_CHANNEL_DATA.map(ch => {
        const Icon = ch.icon;
        return (
          <Card key={ch.id} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-sm" style={{ backgroundColor: ch.color + '20' }}>
                <Icon className="w-4 h-4" style={{ color: ch.color }} />
              </div>
              <div className="text-xs font-semibold text-foreground">{ch.label}</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-muted-foreground uppercase">War Cost</span>
                <span className="text-sm font-bold font-mono text-red-400">{fmtB(ch.warCost)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-muted-foreground uppercase">Peace Gain</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{fmtB(ch.peaceBenefit)}</span>
              </div>
              <div className="h-px bg-border/50 my-1" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">{ch.description}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StakeholderWaterfallChart({ stakeholders }: { stakeholders: StakeholderCBA[] }) {
  const sorted = [...stakeholders].sort((a, b) => b.netSwingB - a.netSwingB).slice(0, 12);
  const data = sorted.map(s => ({
    name: s.flag + " " + (s.name.length > 12 ? s.name.slice(0, 11) + "…" : s.name),
    warCost: -s.warCostB,
    peaceBenefit: s.peaceBenefitB,
    netSwing: s.netSwingB,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
        <Scale className="w-4 h-4 text-primary" />
        Stakeholder Impact Comparison
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Top 12 stakeholders by total war-to-peace swing (USD billions/year).</p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} layout="vertical" barGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'USD Billions', position: 'insideBottom', style: { fontSize: 10, fill: '#94a3b8' }, offset: -2 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={120} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              formatter={(v: number, name: string) => {
                if (name === 'warCost') return [`$${Math.abs(v).toFixed(1)}B`, 'War Cost'];
                if (name === 'peaceBenefit') return [`$${v.toFixed(1)}B`, 'Peace Benefit'];
                return [`$${v.toFixed(1)}B`, 'Net Swing'];
              }}
            />
            <Legend formatter={(v: string) => v === 'warCost' ? 'War Cost' : 'Peace Benefit'} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="warCost" fill="#ef4444" radius={[2, 2, 2, 2]} stackId="stack" />
            <Bar dataKey="peaceBenefit" fill="#10b981" radius={[2, 2, 2, 2]} stackId="stack" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StakeholderRadarChart({ stakeholder }: { stakeholder: StakeholderCBA }) {
  const data = CHANNELS.map(ch => ({
    channel: ch.label.split(" & ")[0].split(" (")[0],
    warCost: stakeholder.channels[ch.id].warCost,
    peaceBenefit: stakeholder.channels[ch.id].peaceBenefit,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="channel" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <PolarRadiusAxis tick={{ fontSize: 8, fill: '#64748b' }} />
          <Radar name="War Cost" dataKey="warCost" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
          <Radar name="Peace Benefit" dataKey="peaceBenefit" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StakeholderRow({ s, isExpanded, onToggle }: { s: StakeholderCBA; isExpanded: boolean; onToggle: () => void }) {
  return (
    <Card className={`transition-all duration-200 ${isExpanded ? 'ring-1 ring-primary/40' : 'hover:border-primary/30'}`}>
      <button onClick={onToggle} className="w-full p-5 text-left">
        <div className="flex items-center gap-4">
          <span className="text-2xl">{s.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground truncate">{s.name}</h3>
              <Badge variant="outline" className="text-[10px] shrink-0">{s.region}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">GDP: {fmtB(s.gdpB)} | War cost as % GDP: {s.warCostPctGdp.toFixed(1)}%</div>
          </div>
          <div className="hidden sm:flex items-center gap-6 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase">War Cost</div>
              <div className="text-sm font-bold font-mono text-red-400">{fmtB(s.warCostB)}/yr</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase">Peace Gain</div>
              <div className="text-sm font-bold font-mono text-emerald-400">{fmtB(s.peaceBenefitB)}/yr</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase">Net Swing</div>
              <div className="text-sm font-bold font-mono text-amber-400">{fmtB(s.netSwingB)}/yr</div>
            </div>
          </div>
          <div className="shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="sm:hidden grid grid-cols-3 gap-2 mt-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">War Cost</div>
            <div className="text-sm font-bold font-mono text-red-400">{fmtB(s.warCostB)}/yr</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Peace Gain</div>
            <div className="text-sm font-bold font-mono text-emerald-400">{fmtB(s.peaceBenefitB)}/yr</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Net Swing</div>
            <div className="text-sm font-bold font-mono text-amber-400">{fmtB(s.netSwingB)}/yr</div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Channel Breakdown (USD Billions/yr)</h4>
                  <div className="space-y-1.5">
                    {CHANNELS.map(ch => {
                      const vals = s.channels[ch.id];
                      const Icon = ch.icon;
                      const maxVal = Math.max(...CHANNELS.map(c => Math.max(Math.abs(s.channels[c.id].warCost), Math.abs(s.channels[c.id].peaceBenefit))));
                      return (
                        <div key={ch.id} className="flex items-center gap-2 text-xs">
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: ch.color }} />
                          <span className="w-20 truncate text-muted-foreground">{ch.label.split(" & ")[0]}</span>
                          <div className="flex-1 flex items-center gap-1">
                            <div className="flex-1 h-4 bg-secondary/30 rounded-sm overflow-hidden flex">
                              <div
                                className="h-full bg-red-500/60 rounded-l-sm"
                                style={{ width: `${maxVal > 0 ? (Math.abs(vals.warCost) / maxVal) * 50 : 0}%` }}
                              />
                              <div
                                className="h-full bg-emerald-500/60 rounded-r-sm"
                                style={{ width: `${maxVal > 0 ? (Math.abs(vals.peaceBenefit) / maxVal) * 50 : 0}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-14 text-right font-mono text-red-400">{vals.warCost < 0 ? '+' : '-'}{fmtB(Math.abs(vals.warCost))}</span>
                          <span className="w-14 text-right font-mono text-emerald-400">+{fmtB(Math.abs(vals.peaceBenefit))}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-[10px] text-muted-foreground italic">
                    Negative war costs (e.g. energy for exporters) indicate windfall transfers, not efficiency gains.
                  </div>
                </div>
                <StakeholderRadarChart stakeholder={s} />
              </div>
              {(s.displaced > 0 || s.casualties > 0) && (
                <div className="flex gap-4 flex-wrap">
                  {s.displaced > 0 && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 bg-orange-950/30 border border-orange-800/30 rounded-sm">
                      <HeartPulse className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-orange-300 font-mono font-bold">{fmtNum(s.displaced)}</span>
                      <span className="text-muted-foreground">displaced</span>
                    </div>
                  )}
                  {s.casualties > 0 && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 bg-red-950/30 border border-red-800/30 rounded-sm">
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-300 font-mono font-bold">{fmtNum(s.casualties)}</span>
                      <span className="text-muted-foreground">casualties</span>
                    </div>
                  )}
                </div>
              )}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Facts</h4>
                <ul className="space-y-1">
                  {s.keyFacts.map((fact, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function TreemapContent(props: any) {
  const { x, y, width, height, name, warCost } = props;
  if (width < 40 || height < 25) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={props.color || "#ef4444"} fillOpacity={0.3} stroke="#1e293b" strokeWidth={1} rx={2} />
      {width > 50 && height > 30 && (
        <>
          <text x={x + 6} y={y + 14} fill="#f8fafc" fontSize={10} fontWeight="bold">{name}</text>
          <text x={x + 6} y={y + 26} fill="#94a3b8" fontSize={9}>{fmtB(warCost)}/yr</text>
        </>
      )}
    </g>
  );
}

function CostTreemap() {
  const sorted = [...STAKEHOLDERS].sort((a, b) => b.warCostB - a.warCostB);
  const data = sorted.map(s => ({
    name: s.flag + " " + s.name,
    warCost: s.warCostB,
    color: s.warCostPctGdp > 5 ? "#dc2626" : s.warCostPctGdp > 2 ? "#f59e0b" : "#3b82f6",
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
        <Globe className="w-4 h-4 text-primary" />
        War Cost Distribution
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Proportional size = annual war cost. Color intensity = cost as % of GDP (red = &gt;5%, amber = 2-5%, blue = &lt;2%).</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="warCost"
            nameKey="name"
            content={<TreemapContent />}
          />
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MethodologyNote() {
  return (
    <Card className="p-6 border-primary/20">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
        <Scale className="w-4 h-4 text-primary" />
        Methodology & Accounting Framework
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
        <div>
          <div className="font-semibold text-foreground mb-1">Real Resource Losses</div>
          <p className="leading-relaxed">Physical destruction, lost output, wasted fuel, rerouting costs, labor losses. These reduce global wealth.</p>
        </div>
        <div>
          <div className="font-semibold text-foreground mb-1">Transfers & Redistribution</div>
          <p className="leading-relaxed">Oil price shifts, sanctions rents, windfall profits. These shift income between stakeholders but may not reduce global output.</p>
        </div>
        <div>
          <div className="font-semibold text-foreground mb-1">Risk & Confidence Effects</div>
          <p className="leading-relaxed">Insurance premia, sovereign spreads, investment uncertainty. These change welfare through volatility and capital allocation.</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 italic">
        Estimates model war and peace as alternative states of the same system. Stakeholder figures include transfers; global totals net out internal transfers to avoid double-counting. Ranges: conservative to upside; base case shown.
      </p>
    </Card>
  );
}

export default function CostsExplorer() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("netSwingB");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  const regions = useMemo(() => {
    const r = new Set(STAKEHOLDERS.map(s => s.region));
    return ["all", ...Array.from(r)];
  }, []);

  const sortedStakeholders = useMemo(() => {
    let list = regionFilter === "all" ? [...STAKEHOLDERS] : STAKEHOLDERS.filter(s => s.region === regionFilter);
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return (bv as number) - (av as number);
    });
    return list;
  }, [sortKey, regionFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Cost-Benefit Analysis"
        description="Comparing the economic costs of ongoing war with the benefits of negotiated peace — by channel and by stakeholder."
      />

      <GlobalSummaryCards />

      <HumanitarianBanner />

      <ChannelBreakdownChart />

      <ChannelCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StakeholderWaterfallChart stakeholders={STAKEHOLDERS} />
        <CostTreemap />
      </div>

      <MethodologyNote />

      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Stakeholder Detail
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="bg-card border border-border text-sm px-3 py-1.5 rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r === "all" ? "All Regions" : r}</option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="bg-card border border-border text-sm px-3 py-1.5 rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="netSwingB">Sort: Net Swing</option>
              <option value="warCostB">Sort: War Cost</option>
              <option value="peaceBenefitB">Sort: Peace Benefit</option>
              <option value="warCostPctGdp">Sort: % of GDP</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {sortedStakeholders.map(s => (
            <StakeholderRow
              key={s.id}
              s={s}
              isExpanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
