import React, { useState, useMemo } from "react";
import { PageHeader, Card, Badge } from "@/components/ui";
import {
  TrendingUp, Shield, HeartPulse, Ship, Plane, Factory,
  Banknote, Zap, ChevronDown, ChevronUp, ArrowRight, Scale, Globe, BarChart3,
  Info, BookOpen, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap, ReferenceLine,
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
  narrative: string;
  displaced: number;
  casualties: number;
  displacedRange?: [number, number];
  casualtiesRange?: [number, number];
  iranAttributionPct: number;
  humanitarianAttribution: string;
  humanitarianSources: string[];
  humanitarianDateRange: string;
}

const STAKEHOLDERS: StakeholderCBA[] = [
  {
    id: "iran", name: "Iran", flag: "🇮🇷", region: "Core Principal", gdpB: 401,
    warCostB: 87.5, peaceBenefitB: 142.0, netSwingB: 142.0, warCostPctGdp: 21.8,
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
    narrative: "Iran bears the largest absolute war cost of any stakeholder — roughly $87.5B/year — through suppressed oil revenues, a banking system cut off from global finance, and severe productivity losses from sanctions-driven industrial decay. A negotiated peace would unlock an estimated $142B/year in benefits: restored oil exports at full capacity, reintegration into SWIFT and global payment systems, and an FDI surge into Iran's large but underutilized energy and manufacturing base. The gap between war cost and peace benefit is the widest of any stakeholder, reflecting how severely Iran's sanctions-constrained economy undershoots its fundamental potential.",
    displaced: 0, casualties: 1500,
    casualtiesRange: [800, 2500],
    iranAttributionPct: 100,
    humanitarianAttribution: "Fatalities from protest crackdowns linked to sanctions-driven economic hardship and regime security posture (2019 fuel protests, 2022 Mahsa Amini movement). Does not include combat deaths from proxy operations counted under other theaters.",
    humanitarianSources: ["HRANA (Human Rights Activists News Agency), annual reports 2019–2024", "Amnesty International, 'Trampled Humanity' (2023)", "UN OHCHR Iran monitoring reports"],
    humanitarianDateRange: "2019–2024",
  },
  {
    id: "us", name: "United States", flag: "🇺🇸", region: "Core Principal", gdpB: 28780,
    warCostB: 52.0, peaceBenefitB: 38.0, netSwingB: 38.0, warCostPctGdp: 0.18,
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
    narrative: "The United States bears approximately $52B/year in Iran-conflict costs, dominated by CENTCOM's Iran-focused military deployment ($25B+/yr), sanctions enforcement infrastructure, and suppressed bilateral trade and investment. The peace scenario offers a more modest $38B/year gain — US GDP is large enough that even significant absolute improvements register modestly as a share of output, and gains come mostly from reduced military expenditure rather than market access. The lower peace benefit relative to war cost reflects a structurally defensive US posture: the US absorbs real costs to sustain a containment strategy whose primary beneficiary is regional deterrence rather than direct economic return.",
    displaced: 0, casualties: 50,
    casualtiesRange: [30, 80],
    iranAttributionPct: 100,
    humanitarianAttribution: "US military personnel killed in Iran-linked incidents in Iraq, Syria, and Gulf region. Includes January 2024 Tower 22 drone attack (3 killed) and earlier Iran-backed militia strikes on US bases.",
    humanitarianSources: ["US Department of Defense casualty reports", "CRS, 'U.S. Forces in the Middle East' (2024)", "DoD Inspector General quarterly reports on Operation Inherent Resolve"],
    humanitarianDateRange: "2019–2024",
  },
  {
    id: "israel", name: "Israel", flag: "🇮🇱", region: "Core Principal", gdpB: 539,
    warCostB: 43.0, peaceBenefitB: 35.0, netSwingB: 35.0, warCostPctGdp: 8.0,
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
    narrative: "Israel's conflict costs are disproportionate relative to its GDP — estimated at 8% of annual output — driven by continuous reserve mobilization, defense spending well above peacetime levels, tourism collapse, and a sovereign risk premium that raises borrowing costs across the economy. Peace would deliver roughly $35B/year through demobilization savings, normalization of the northern border (contingent on a Hezbollah ceasefire linked to Iran-US de-escalation), and resumption of tech investment and FDI that has stalled since 2023. The wide confidence intervals on Israel's figures reflect genuine uncertainty about whether a comprehensive Iran deal would translate into reduced Hezbollah and Hamas operational capability.",
    displaced: 200000, casualties: 1400,
    displacedRange: [150000, 250000],
    casualtiesRange: [1200, 1800],
    iranAttributionPct: 60,
    humanitarianAttribution: "Displacement from Hezbollah border escalation (northern Israel evacuation ~60K) and Gaza border evacuation (~130K). Casualties include Oct 7 attack and subsequent Hezbollah/Iran-linked incidents. Iran attribution (60%) reflects Hezbollah as primary proxy; Hamas attribution to Iran is debated in the literature.",
    humanitarianSources: ["OCHA Situation Reports, Oct 2023–2024", "Israeli National Emergency Authority (RACHEL)", "IDF official casualty figures", "ICG, 'The Israel-Hezbollah Conflict' (2024)"],
    humanitarianDateRange: "Oct 2023–2024",
  },
  {
    id: "saudi_arabia", name: "Saudi Arabia", flag: "🇸🇦", region: "Gulf State", gdpB: 1108,
    warCostB: 18.5, peaceBenefitB: 28.0, netSwingB: 28.0, warCostPctGdp: 1.7,
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
    narrative: "Saudi Arabia occupies a dual position in the conflict's economics: it bears genuine costs through defense spending, regional instability risk, and dampened Vision 2030 investment, while simultaneously receiving a fiscal windfall from oil prices elevated by Iranian supply suppression. The $18.5B/year war cost is net of this oil revenue transfer; the $28B/year peace scenario delivers primarily through improved investment confidence, shipping normalization, and a regional security environment that reduces Saudi defense burden. Saudi Arabia's net swing to peace is positive but more muted than peers because oil price normalization reduces some of the fiscal space that currently underpins its transformation agenda.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded in this territory from the Iran conflict complex. Economic impact is the primary transmission channel.",
    humanitarianSources: ["UNHCR Global Trends (2024): no Saudi Arabia entries under Iran-related displacement"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "uae", name: "UAE", flag: "🇦🇪", region: "Gulf State", gdpB: 509,
    warCostB: 14.0, peaceBenefitB: 22.0, netSwingB: 22.0, warCostPctGdp: 2.8,
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
    narrative: "The UAE's Dubai-centric logistics and aviation model is acutely sensitive to Hormuz risk and war-risk insurance spikes — war costs of ~$14B/year reflect insurance premium surges, aviation rerouting overhead, and reduced trade volumes through Jebel Ali. Peace would unlock ~$22B/year by restoring the UAE as the region's premier transshipment hub, normalizing insurance rates, and reigniting tourism and FDI that have been suppressed by conflict risk. The UAE's high peace-benefit-to-war-cost ratio reflects the powerful multiplier effect that open-economy stability has on a service and logistics-driven GDP.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded. 2022 Houthi drone/missile attacks on Abu Dhabi targeted infrastructure but caused minimal casualties (3 killed). Economic/logistics disruption is the primary impact channel.",
    humanitarianSources: ["UNHCR Global Trends (2024)", "OCHA Gulf region sitreps"],
    humanitarianDateRange: "2022–2024",
  },
  {
    id: "europe", name: "Europe (EU+UK)", flag: "🇪🇺", region: "Major External", gdpB: 19800,
    warCostB: 42.0, peaceBenefitB: 55.0, netSwingB: 55.0, warCostPctGdp: 0.21,
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
    narrative: "Europe bears approximately $42B/year through LNG price premiums, sanctions compliance overhead, Suez-via-Cape shipping rerouting costs, and suppressed investment in Middle Eastern infrastructure projects. The $55B/year peace benefit flows primarily from energy market normalization — eliminating the $2–4/MMBtu Hormuz risk premium on LNG, resuming Iranian market trade, and reducing terrorism and migration pressure linked to regional instability. Europe is unusual among stakeholders in having both high absolute war costs and one of the stronger peace-benefit ratios among non-core principals, reflecting its deep trade and energy links to the region.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities in EU/UK territory from the Iran conflict complex. Humanitarian costs are borne through refugee reception from spillover theaters (not counted here to avoid double-counting with origin countries) and economic channels.",
    humanitarianSources: ["UNHCR Global Trends (2024)", "Eurostat asylum statistics"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "china", name: "China", flag: "🇨🇳", region: "Major External", gdpB: 17960,
    warCostB: 35.0, peaceBenefitB: 48.0, netSwingB: 48.0, warCostPctGdp: 0.19,
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
    narrative: "China's position is paradoxical: it pays Hormuz energy risk premiums while simultaneously purchasing discounted sanctioned Iranian oil — making its net war cost ($35B/year) larger than raw energy figures suggest. Peace would expand China's access to Iranian oil and gas at normalized prices, accelerate Belt and Road project completion across the region, and reduce shipping insurance overhead borne by Chinese exporters. The $48B/year peace benefit reflects China's status as the world's largest oil importer and its enormous stake in Middle Eastern supply stability — a peace deal would strengthen rather than displace China's regional economic footprint.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded in China from the Iran conflict complex. Impact is transmitted through energy price and trade channels.",
    humanitarianSources: ["UNHCR Global Trends (2024)"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "india", name: "India", flag: "🇮🇳", region: "Major External", gdpB: 3940,
    warCostB: 22.0, peaceBenefitB: 30.0, netSwingB: 30.0, warCostPctGdp: 0.56,
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
    narrative: "India pays roughly $22B/year in Iran-conflict-related costs, concentrated in Hormuz energy risk premiums, shipping disruption, and stalled bilateral trade — most visibly the India-Iran Chabahar corridor that remains blocked by US secondary sanctions. The $30B/year peace benefit flows from energy cost normalization, activation of Chabahar as a strategic logistics corridor to Afghanistan and Central Asia, and expanded exports of pharmaceuticals, IT services, and agricultural goods into a post-sanctions Iranian market. India's relatively high war-cost-to-GDP ratio (0.56%) reflects its structural energy import dependence and the degree to which Hormuz disruption feeds through into domestic inflation.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded in India from the Iran conflict complex. Impact is transmitted through energy import costs and shipping disruption.",
    humanitarianSources: ["UNHCR Global Trends (2024)"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "japan_korea", name: "Japan + South Korea", flag: "🇯🇵", region: "Major External", gdpB: 7200,
    warCostB: 28.0, peaceBenefitB: 32.0, netSwingB: 32.0, warCostPctGdp: 0.39,
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
    narrative: "Japan and South Korea are among the world's most Hormuz-dependent economies, with approximately 80% of their oil and LNG imports transiting the strait. Combined war costs of $28B/year are dominated by energy price premiums, war-risk insurance on tankers, and burden-sharing contributions to Gulf security frameworks. Peace would deliver $32B/year primarily through energy cost normalization and a reduction in the implicit security subsidy embedded in both nations' defense commitments to the region — modest as a GDP share but significant in absolute terms for two of the world's largest industrial importers.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded from the Iran conflict complex. Energy import dependence on Hormuz transit is the primary risk channel.",
    humanitarianSources: ["UNHCR Global Trends (2024)"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "russia", name: "Russia", flag: "🇷🇺", region: "Major External", gdpB: 2240,
    warCostB: 4.0, peaceBenefitB: 3.0, netSwingB: 3.0, warCostPctGdp: 0.18,
    channels: {
      trade: { warCost: -2.0, peaceBenefit: 0.5 },
      energy: { warCost: -12.0, peaceBenefit: 2.0 },
      shipping: { warCost: 0.5, peaceBenefit: 0.5 },
      finance: { warCost: 0.5, peaceBenefit: 0.5 },
      aviation: { warCost: 1.0, peaceBenefit: 0.5 },
      security: { warCost: -3.0, peaceBenefit: 1.0 },
      humanitarian: { warCost: 0.0, peaceBenefit: 0.0 },
      productivity: { warCost: 2.0, peaceBenefit: 2.0 },
    },
    keyFacts: [
      "Major oil/gas exporter — Iranian oil sanctions sustain global price floor, worth ~$12–15B/year in Russia's favor",
      "Iran supplied Russia with 3,700+ Shahed-136/238 drones for use in Ukraine; peace likely ends this supply chain",
      "Built and operates Iran's Bushehr nuclear plant — gives Russia leverage in JCPOA diplomacy",
      "Shares Western sanctions adversity with Iran; coordinates on sanctions evasion and dollar alternatives",
    ],
    narrative: "Russia is the only major stakeholder that is a structural net beneficiary of the Iran conflict complex. Iranian oil export suppression sustains a global price floor worth an estimated $12–15B/year to Russian fiscal revenues, while the Shahed drone supply chain has been strategically critical to Russia's war in Ukraine. Russia's $4B/year nominal war cost reflects only genuine volatility and escalation risks — not economic harm. A peace deal would reduce Russian oil revenues, sever the Iran drone supply chain, and weaken Russia's leverage as a sanctions-coordination partner — giving Russia a strong material interest in obstructing Iran-US normalization.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 5,
    humanitarianAttribution: "No direct conflict displacement or fatalities in Russia attributable to the Iran conflict complex. Russia is primarily an economic and strategic beneficiary of Iran tensions.",
    humanitarianSources: ["UNHCR Global Trends (2024)"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "ukraine", name: "Ukraine", flag: "🇺🇦", region: "Major External", gdpB: 179,
    warCostB: 18.0, peaceBenefitB: 14.0, netSwingB: 14.0, warCostPctGdp: 10.1,
    channels: {
      trade: { warCost: 2.0, peaceBenefit: 2.5 },
      energy: { warCost: 4.0, peaceBenefit: 3.0 },
      shipping: { warCost: 1.5, peaceBenefit: 1.5 },
      finance: { warCost: 2.5, peaceBenefit: 2.0 },
      aviation: { warCost: 1.0, peaceBenefit: 1.0 },
      security: { warCost: 5.0, peaceBenefit: 2.0 },
      humanitarian: { warCost: 1.0, peaceBenefit: 1.0 },
      productivity: { warCost: 1.0, peaceBenefit: 1.0 },
    },
    keyFacts: ["Iran supplies Russia with Shahed drones used against Ukrainian infrastructure", "Iran peace could reduce Russia's military supply chain leverage", "Energy infrastructure 40%+ damaged — higher global energy prices compound burden", "Grain exports disrupted, compounding global food insecurity"],
    narrative: "Ukraine's $18B/year conflict cost from the Iran nexus is indirect but devastating: Iranian Shahed drones have destroyed more than 40% of the country's power grid infrastructure, while elevated global energy prices compound the import burden of a wartime economy. A peace deal's $14B/year benefit is slightly below war cost, reflecting that physical infrastructure damage cannot be immediately reversed even after the drone supply chain is severed — but future reconstruction proceeds under materially less hostile conditions. Ukraine is unique among stakeholders in that its peace benefit comes not from economic opportunity but from the cessation of a weapons transfer that has been strategically critical to Russia's campaign.",
    displaced: 6500000, casualties: 40000,
    displacedRange: [6000000, 8000000],
    casualtiesRange: [25000, 60000],
    iranAttributionPct: 5,
    humanitarianAttribution: "Total figures are from the Russia-Ukraine war. Iran's role is limited to the Shahed-136/238 drone supply chain (~3,700+ drones delivered per Ukrainian military estimates). The 5% attribution weight reflects the drone campaign's estimated share of total damage. These figures are included for systemic context, not as direct Iran-conflict casualties.",
    humanitarianSources: ["UNHCR Ukraine Situation, operational data portal (2024)", "UN OHCHR, civilian casualty update (Feb 2022–2024)", "Ukrainian Ministry of Defense drone tracking reports", "RUSI, 'The Shahed Effect: Iran's Drone War in Ukraine' (2023)", "IISS Strategic Survey 2024"],
    humanitarianDateRange: "Feb 2022–2024",
  },
  {
    id: "iraq", name: "Iraq", flag: "🇮🇶", region: "Regional Spillover", gdpB: 264,
    warCostB: 12.0, peaceBenefitB: 15.0, netSwingB: 15.0, warCostPctGdp: 4.5,
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
    keyFacts: ["Direct spillover conflict risk from Iran-backed PMF", "Trade corridor to Iran disrupted", "IDP population linked to post-ISIS and militia activity"],
    narrative: "Iraq bears $12B/year in conflict costs from Iran-backed PMF activity, disrupted trade corridors, and a foreign investment climate depressed by regional instability — all while being constitutionally dependent on both Iran and the US. Peace would unlock $15B/year through normalized trade flows, a revival of US-aligned investment in Iraq's substantial but underdeveloped energy sector, and a reduction in PMF-related security expenditures. Iraq's complex dual-alignment — simultaneously a US ally and an Iranian partner state — means peace benefits would be distributed across competing domestic factions with different stakes in the outcome.",
    displaced: 1200000, casualties: 3500,
    displacedRange: [1000000, 1500000],
    casualtiesRange: [2000, 5000],
    iranAttributionPct: 50,
    humanitarianAttribution: "Internal displacement from multiple overlapping conflicts including post-ISIS operations, Iran-backed Popular Mobilization Forces (PMF) activity, and Turkey-PKK cross-border operations. Iran attribution (50%) reflects PMF's significant but not sole role in instability. Casualty figures cover conflict-related fatalities in areas with active Iran-linked militia presence.",
    humanitarianSources: ["IOM Iraq Displacement Tracking Matrix (2024)", "UNHCR Iraq operational data", "ACLED Iraq conflict data (2019–2024)", "ICG, 'Iraq's Militia Politics' (2023)"],
    humanitarianDateRange: "2019–2024",
  },
  {
    id: "turkey", name: "Turkey", flag: "🇹🇷", region: "Regional Spillover", gdpB: 1108,
    warCostB: 10.0, peaceBenefitB: 16.0, netSwingB: 16.0, warCostPctGdp: 0.9,
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
    narrative: "Turkey bears $10B/year in conflict costs primarily through energy import premiums (Turkey has no domestic oil production), Hormuz-linked insurance increases, and suppressed regional trade. Peace would deliver $16B/year through energy cost normalization, revival of Turkish construction and services exports into a post-sanctions Iran, and reduced refugee pressure from Syria — partly a consequence of Iran's role in sustaining that conflict. Turkey's large construction and services sectors stand to be among the most direct commercial beneficiaries of a regional peace dividend.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "Turkey hosts ~3.6M Syrian refugees but these are counted at origin to avoid double-counting. No direct Iran-complex conflict casualties recorded in Turkish territory.",
    humanitarianSources: ["UNHCR Turkey factsheet (2024)", "DGMM Turkey migration statistics"],
    humanitarianDateRange: "2011–2024",
  },
  {
    id: "lebanon", name: "Lebanon", flag: "🇱🇧", region: "Regional Spillover", gdpB: 22,
    warCostB: 8.5, peaceBenefitB: 6.0, netSwingB: 6.0, warCostPctGdp: 38.6,
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
    keyFacts: ["Direct conflict damage to infrastructure from Israel-Hezbollah war", "Sovereign default deepened by war", "1.5M Syrian refugees + new displacement from 2023–2024 escalation"],
    narrative: "Lebanon's situation is more severe than its $8.5B/year war cost suggests in percentage terms — at approximately 39% of GDP, it represents the most conflict-burdened economy in the dataset outside Yemen. Hezbollah, as Iran's most directly armed and financed proxy, has drawn Lebanon into repeated military confrontations that have destroyed infrastructure, collapsed the currency, and deepened a sovereign default that predates the 2023–2024 escalation. A peace deal reducing Iranian arms flows to Hezbollah could stabilize Lebanon's security environment and unlock IMF financing that has been politically blocked for years.",
    displaced: 1200000, casualties: 2500,
    displacedRange: [900000, 1500000],
    casualtiesRange: [1500, 4000],
    iranAttributionPct: 40,
    humanitarianAttribution: "Includes ~200K+ displaced from 2023–2024 Israel-Hezbollah escalation (Iran-attributable via Hezbollah) and ~1M Syrian refugees (not Iran-attributable). Casualties primarily from Israeli operations against Hezbollah in Lebanese territory. Attribution (40%) reflects mixed causation: Hezbollah (Iran proxy) is the Iran-linked driver, but Syrian refugee displacement predates and is largely separate from the Iran conflict complex.",
    humanitarianSources: ["UNHCR Lebanon operational data (2024)", "OCHA Lebanon Flash Updates (2023–2024)", "Lebanese Red Cross situation reports", "ICG, 'Hezbollah's War Gamble' (2024)"],
    humanitarianDateRange: "2023–2024 (displacement), 2011–2024 (refugees cumulative)",
  },
  {
    id: "yemen", name: "Yemen", flag: "🇾🇪", region: "Regional Spillover", gdpB: 22,
    warCostB: 6.0, peaceBenefitB: 4.0, netSwingB: 4.0, warCostPctGdp: 27.3,
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
    keyFacts: ["Red Sea / Bab el-Mandeb disruption by Houthi forces", "21M people need humanitarian aid (OCHA 2024)", "Infrastructure largely destroyed after 9 years of war"],
    narrative: "Yemen has been the principal theater of Iran-backed Houthi conflict, with costs that are catastrophic relative to its tiny formal economy. The Houthi movement, substantially armed and financed by Iran, has sustained a civil war that has destroyed critical infrastructure and produced one of the world's worst humanitarian crises in modern history. Peace benefits are estimated at $4B/year — modest in absolute terms but enormous relative to Yemen's $22B GDP — and depend entirely on a Houthi ceasefire that would only follow an Iran-US deal removing Iran's strategic incentive to sustain the Houthi military capacity.",
    displaced: 4500000, casualties: 150000,
    displacedRange: [4000000, 4700000],
    casualtiesRange: [100000, 377000],
    iranAttributionPct: 80,
    humanitarianAttribution: "Yemen's civil war (2014–present) involves Iran-backed Houthi forces as a primary belligerent. Displacement figure is internally displaced persons (IDPs). Casualty figure uses ACLED's direct conflict fatalities estimate (~150K); the UN Development Programme estimates total deaths including disease and famine at ~377K through 2021. Attribution (80%) reflects Iran's substantial role through Houthi support (arms, training, financing), while acknowledging local political dynamics and Saudi-led coalition actions as co-drivers.",
    humanitarianSources: ["UNHCR Yemen operational data (2024)", "ACLED, Yemen conflict data (2015–2024): ~150K direct fatalities", "UN Development Programme, 'Assessing the Impact of War on Development in Yemen' (2021): 377K total deaths", "OCHA Yemen Humanitarian Needs Overview (2024)", "UN Panel of Experts on Yemen, S/2024/135"],
    humanitarianDateRange: "2015–2024",
  },
  {
    id: "egypt", name: "Egypt", flag: "🇪🇬", region: "Regional Spillover", gdpB: 395,
    warCostB: 8.0, peaceBenefitB: 12.0, netSwingB: 12.0, warCostPctGdp: 2.0,
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
    narrative: "Egypt bears $8B/year in Iran-conflict-related costs primarily through Suez Canal revenue loss from Houthi attacks that have diverted $60–80B/year in annual shipping away from the canal, plus elevated energy import costs and suppressed Red Sea tourism. Peace would deliver $12B/year through Suez Canal revenue normalization, reduced energy costs, and recovery of tourism from Gulf and Western visitors deterred by regional instability. Egypt's ownership of the Suez Canal gives it an unusually concrete stake in Hormuz and Red Sea stability — one of the clearest single revenue-channel dependencies in the dataset.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded in Egypt from the Iran conflict complex. Suez Canal disruption from Houthi attacks is the primary impact channel. Hosts some refugees from neighboring conflicts (not counted here).",
    humanitarianSources: ["UNHCR Global Trends (2024)", "Suez Canal Authority reports"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "qatar", name: "Qatar", flag: "🇶🇦", region: "Gulf State", gdpB: 219,
    warCostB: 6.0, peaceBenefitB: 10.0, netSwingB: 10.0, warCostPctGdp: 2.7,
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
    narrative: "Qatar occupies an unusual position: it benefits from elevated LNG prices while simultaneously bearing costs from aviation hub disruption and regional instability risk to its investment portfolio. The net $6B/year war cost reflects real losses that exceed the LNG windfall once shipping insurance, suppressed FDI, and diplomatic overhead are accounted for. Peace would deliver $10B/year through energy market stability, normalization of Qatar's regional diplomatic role — interrupted by the 2017–2021 Gulf blockade and its aftermath — and reduced security premia on Gulf LNG infrastructure that underwriters price into Qatar's project finance.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded in Qatar from the Iran conflict complex. Qatar serves as diplomatic mediator; impact is economic (aviation, LNG pricing).",
    humanitarianSources: ["UNHCR Global Trends (2024)"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "pakistan", name: "Pakistan", flag: "🇵🇰", region: "Regional Spillover", gdpB: 374,
    warCostB: 7.0, peaceBenefitB: 9.0, netSwingB: 9.0, warCostPctGdp: 1.9,
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
    narrative: "Pakistan bears $7B/year in conflict costs through elevated energy import prices and a stalled Iran-Pakistan gas pipeline that has been blocked by US secondary sanctions despite being desperately needed for Pakistan's chronic energy shortfall. Peace would deliver $9B/year — primarily through pipeline activation, which would be transformative for Pakistan's energy-constrained economy, normalized trade with Iran, and reduced border security costs. The Iran-Pakistan gas pipeline represents one of the clearest single-infrastructure benefits that an Iran deal could unlock: a project already partially built, awaiting only sanctions relief to complete.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "No direct conflict displacement or fatalities recorded in Pakistan from the Iran conflict complex. Cross-border Balochistan tensions exist but are not part of the Iran-proxy conflict network tracked here.",
    humanitarianSources: ["UNHCR Global Trends (2024)", "OCHA Pakistan situation reports"],
    humanitarianDateRange: "N/A",
  },
  {
    id: "jordan", name: "Jordan", flag: "🇯🇴", region: "Regional Spillover", gdpB: 50,
    warCostB: 4.0, peaceBenefitB: 5.0, netSwingB: 5.0, warCostPctGdp: 8.0,
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
    narrative: "Jordan bears $4B/year in conflict costs concentrated in trade disruption and a regional risk premium that suppresses tourism and foreign investment — significant for an economy whose main exports are services and phosphates. Peace would deliver $5B/year through restored overland trade corridors to Iraq and Syria, normalization of Jordan's strategic transit role, and a recovery in tourism that has been persistently dampened by regional insecurity. Jordan is primarily a passive absorber of regional stability changes rather than a principal actor, with limited leverage over the conflict's trajectory but real exposure to its economic consequences.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "Jordan hosts ~1.3M Syrian and ~65K Iraqi refugees but these are counted at origin to avoid double-counting. No direct Iran-complex conflict casualties recorded in Jordanian territory.",
    humanitarianSources: ["UNHCR Jordan factsheet (2024)", "Jordan Response Plan for the Syria Crisis (2024)"],
    humanitarianDateRange: "2011–2024",
  },
  {
    id: "global_south_importers", name: "Global South (Importers)", flag: "🌍", region: "Global", gdpB: 15000,
    warCostB: 45.0, peaceBenefitB: 55.0, netSwingB: 55.0, warCostPctGdp: 0.3,
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
    narrative: "The Global South energy-importing bloc — representing over $15 trillion in GDP across dozens of developing economies — bears an estimated $45B/year in conflict costs through elevated oil and LNG import prices, food price inflation via petrochemical fertilizer pass-through, and supply chain disruptions. Peace would deliver $55B/year through energy price normalization that reduces inflation, frees import budgets for development spending, and relieves the fiscal deficits that have forced austerity in the most vulnerable economies. These countries bear the economic costs of a conflict they had no role in creating and possess little leverage to resolve — making the Global South the largest aggregate constituency for a peace dividend whose interests are systematically underrepresented in the negotiating room.",
    displaced: 0, casualties: 0,
    iranAttributionPct: 0,
    humanitarianAttribution: "Indirect humanitarian impact through food and energy price inflation. Difficult to separate from other global shocks. Not counted in direct humanitarian totals.",
    humanitarianSources: ["FAO Food Price Index", "World Bank Commodity Markets Outlook (2024)"],
    humanitarianDateRange: "2022–2024",
  },
];

const GLOBAL_WAR_COST_B = STAKEHOLDERS.reduce((s, sh) => s + sh.warCostB, 0);
const GLOBAL_PEACE_BENEFIT_B = STAKEHOLDERS.reduce((s, sh) => s + sh.peaceBenefitB, 0);
// Corrected: the net gain from transitioning war→peace = peaceBenefitB per stakeholder.
// The former formula (warCost + peaceBenefit) double-counted cost cessation, which is
// already embedded in peaceBenefitB. See methodology note for decomposition.
const GLOBAL_NET_SWING_B = GLOBAL_PEACE_BENEFIT_B;
// Component breakdown: cost reversal = war costs that stop; peace dividend = new activity above pre-conflict
const GLOBAL_COST_REVERSAL_B = STAKEHOLDERS.reduce((s, sh) => s + Math.min(sh.warCostB, sh.peaceBenefitB), 0);
const GLOBAL_PEACE_DIVIDEND_B = STAKEHOLDERS.reduce((s, sh) => s + Math.max(0, sh.peaceBenefitB - sh.warCostB), 0);
const GLOBAL_CHANNEL_DATA = CHANNELS.map(ch => {
  const warCost = STAKEHOLDERS.reduce((s, sh) => s + Math.max(0, sh.channels[ch.id].warCost), 0);
  const peaceBenefit = STAKEHOLDERS.reduce((s, sh) => s + Math.max(0, sh.channels[ch.id].peaceBenefit), 0);
  return { ...ch, warCost, peaceBenefit };
});

type SortKey = "warCostB" | "peaceBenefitB" | "netSwingB" | "warCostPctGdp";

function GlobalSummaryCards() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-red-500">
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">Annual Conflict Cost</div>
          <div className="text-2xl font-bold font-mono text-red-400">{fmtB(GLOBAL_WAR_COST_B)}</div>
          <div className="text-xs text-muted-foreground mt-1">GDP-equivalent loss vs. pre-conflict baseline</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">Annual Peace Gain</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{fmtB(GLOBAL_PEACE_BENEFIT_B)}</div>
          <div className="text-xs text-muted-foreground mt-1">Net gain transitioning from conflict to peace</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">Of which: Peace Dividend</div>
          <div className="text-2xl font-bold font-mono text-blue-400">{fmtB(GLOBAL_PEACE_DIVIDEND_B)}</div>
          <div className="text-xs text-muted-foreground mt-1">New economic activity above pre-conflict level</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-purple-500">
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">5-Year Value of Peace</div>
          <div className="text-2xl font-bold font-mono text-purple-400">{fmtB(GLOBAL_NET_SWING_B * 5)}</div>
          <div className="text-xs text-muted-foreground mt-1">Cumulative peace gain over 5 years</div>
        </Card>
      </div>
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-950/20 border border-blue-800/20 rounded-sm">
        <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Accounting note:</strong> The <span className="text-emerald-400 font-medium">Annual Peace Gain</span> ({fmtB(GLOBAL_PEACE_BENEFIT_B)}) is the correct measure of the war→peace transition.
          It decomposes into <span className="text-amber-400 font-medium">cost reversal</span> ({fmtB(GLOBAL_COST_REVERSAL_B)} — conflict costs that cease) and <span className="text-blue-400 font-medium">peace dividend</span> ({fmtB(GLOBAL_PEACE_DIVIDEND_B)} — genuinely new economic activity above the pre-conflict baseline).
          Adding the conflict cost ({fmtB(GLOBAL_WAR_COST_B)}) to the peace gain would double-count the cost-cessation component.
        </p>
      </div>
    </div>
  );
}


function ChannelBreakdownChart() {
  const data = GLOBAL_CHANNEL_DATA.map(ch => ({
    name: ch.label.split(" & ")[0].split(" (")[0],
    warCost: -ch.warCost,
    peaceBenefit: ch.peaceBenefit,
  }));

  const maxAbsVal = Math.max(...data.flatMap(d => [Math.abs(d.warCost), d.peaceBenefit]));
  const domainMax = Math.ceil(maxAbsVal / 10) * 10 + 10;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-primary" />
        Channel-by-Channel Decomposition
      </h3>
      <p className="text-xs text-muted-foreground mb-1">Annual global impact by economic channel (USD billions).</p>
      <p className="text-xs text-muted-foreground mb-4">
        <span className="text-red-400 font-medium">← War cost (left)</span> and <span className="text-emerald-400 font-medium">peace benefit (right) →</span>, both from the center zero line.
      </p>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={3} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              domain={[-domainMax, domainMax]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => `$${Math.abs(v)}B`}
            />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              formatter={(v: number, name: string) => {
                if (name === 'warCost') return [`$${Math.abs(v).toFixed(1)}B/yr`, 'War Cost'];
                if (name === 'peaceBenefit') return [`$${(v as number).toFixed(1)}B/yr`, 'Peace Benefit'];
                return [`$${Math.abs(v).toFixed(1)}B`, name];
              }}
            />
            <Legend formatter={(v: string) => v === 'warCost' ? 'War Cost' : 'Peace Benefit'} wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
            <Bar dataKey="warCost" name="warCost" fill="#ef4444" radius={[0, 2, 2, 0]} barSize={10} />
            <Bar dataKey="peaceBenefit" name="peaceBenefit" fill="#10b981" radius={[0, 2, 2, 0]} barSize={10} />
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
                <span className="text-xs text-muted-foreground uppercase">War Cost</span>
                <span className="text-sm font-bold font-mono text-red-400">{fmtB(ch.warCost)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground uppercase">Peace Gain</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{fmtB(ch.peaceBenefit)}</span>
              </div>
              <div className="h-px bg-border/50 my-1" />
              <p className="text-xs text-muted-foreground leading-relaxed">{ch.description}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StakeholderWaterfallChart({ stakeholders }: { stakeholders: StakeholderCBA[] }) {
  const sorted = [...stakeholders].sort((a, b) => b.peaceBenefitB - a.peaceBenefitB).slice(0, 10);
  const data = sorted.map(s => ({
    name: s.flag + " " + s.name,
    warCost: -s.warCostB,
    peaceBenefit: s.peaceBenefitB,
  }));

  const maxAbsVal = Math.max(...data.flatMap(d => [Math.abs(d.warCost), d.peaceBenefit]));
  const domainMax = Math.ceil(maxAbsVal / 10) * 10 + 15;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
        <Scale className="w-4 h-4 text-primary" />
        Stakeholder Impact Comparison
      </h3>
      <p className="text-xs text-muted-foreground mb-1">Top 10 stakeholders by total war-to-peace swing (USD billions/year).</p>
      <p className="text-xs text-muted-foreground mb-4">
        Each stakeholder shows two bars: <span className="text-red-400 font-medium">← war cost (left)</span> and <span className="text-emerald-400 font-medium">peace benefit (right) →</span>, both measured from the center zero line.
      </p>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical" barGap={3} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              domain={[-domainMax, domainMax]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => `$${Math.abs(v)}B`}
            />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={200} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              formatter={(v: number, name: string) => {
                if (name === 'warCost') return [`$${Math.abs(v).toFixed(1)}B/yr`, 'War Cost'];
                if (name === 'peaceBenefit') return [`$${v.toFixed(1)}B/yr`, 'Peace Benefit'];
                return [`$${Math.abs(v).toFixed(1)}B`, name];
              }}
            />
            <Legend
              formatter={(v: string) => v === 'warCost' ? 'War Cost' : 'Peace Benefit'}
              wrapperStyle={{ fontSize: 11 }}
            />
            <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
            <Bar dataKey="warCost" name="warCost" fill="#ef4444" radius={[0, 2, 2, 0]} barSize={10} />
            <Bar dataKey="peaceBenefit" name="peaceBenefit" fill="#10b981" radius={[0, 2, 2, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StakeholderRadarChart({ stakeholder }: { stakeholder: StakeholderCBA }) {
  const hasNegative = CHANNELS.some(ch =>
    stakeholder.channels[ch.id].warCost < 0 || stakeholder.channels[ch.id].peaceBenefit < 0
  );
  const data = CHANNELS.map(ch => ({
    channel: ch.label.split(" & ")[0].split(" (")[0],
    warCost: Math.max(0, stakeholder.channels[ch.id].warCost),
    peaceBenefit: Math.max(0, stakeholder.channels[ch.id].peaceBenefit),
  }));

  return (
    <div>
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
      {hasNegative && (
        <p className="text-xs text-muted-foreground text-center mt-1 italic">
          Negative values (windfalls/losses) are clamped to zero in this chart — see channel breakdown for full values.
        </p>
      )}
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
              <Badge variant="outline" className="text-xs shrink-0">{s.region}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">GDP: {fmtB(s.gdpB)} | War cost as % GDP: {s.warCostPctGdp.toFixed(1)}%</div>
          </div>
          <div className="hidden sm:flex items-center gap-6 shrink-0">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase">War Cost</div>
              <div className="text-sm font-bold font-mono text-red-400">{fmtB(s.warCostB)}/yr</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase">Peace Gain</div>
              <div className="text-sm font-bold font-mono text-emerald-400">{fmtB(s.peaceBenefitB)}/yr</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase">War→Peace Gain</div>
              <div className="text-sm font-bold font-mono text-amber-400">{fmtB(s.peaceBenefitB)}/yr</div>
            </div>
          </div>
          <div className="shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="sm:hidden grid grid-cols-3 gap-2 mt-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase">War Cost</div>
            <div className="text-sm font-bold font-mono text-red-400">{fmtB(s.warCostB)}/yr</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Peace Gain</div>
            <div className="text-sm font-bold font-mono text-emerald-400">{fmtB(s.peaceBenefitB)}/yr</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">War→Peace Gain</div>
            <div className="text-sm font-bold font-mono text-amber-400">{fmtB(s.peaceBenefitB)}/yr</div>
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
                          <span className={`w-14 text-right font-mono ${vals.warCost < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {vals.warCost < 0 ? '+' : '−'}{fmtB(Math.abs(vals.warCost))}
                          </span>
                          <span className={`w-14 text-right font-mono ${vals.peaceBenefit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {vals.peaceBenefit < 0 ? '−' : '+'}{fmtB(Math.abs(vals.peaceBenefit))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground italic">
                    Negative war costs (e.g. energy for exporters) indicate windfall transfers, not efficiency gains.
                  </div>
                </div>
                <StakeholderRadarChart stakeholder={s} />
              </div>
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
              <div className="mt-4 border-t border-border/40 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Analysis</h4>
                <p className="text-xs text-foreground/90 leading-relaxed">{s.narrative}</p>
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
  if (width < 8 || height < 8) return null;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-muted-foreground">
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
        <div>
          <div className="font-semibold text-foreground mb-1">Humanitarian Accounting</div>
          <p className="leading-relaxed">Displaced persons counted as IDPs at origin (source: UNHCR/IOM). Fatalities use best available conflict data (ACLED, UN OHCHR). Attribution weights estimate Iran complex's causal share.</p>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border/50">
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          Economic Data Sources & Limitations
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground leading-relaxed">
          <div>
            <p className="mb-1.5"><strong className="text-foreground">Economic channel estimates</strong> are modeled using the war-peace alternative states framework: each stakeholder's war cost and peace benefit are estimated per channel using public data from IMF Article IV reports, World Bank commodity outlooks, UNCTAD trade data, IEA energy reports, Lloyd's shipping indices, and published academic estimates of sanctions costs.</p>
            <p><strong className="text-foreground">GDP figures</strong> use IMF World Economic Outlook (2024) nominal GDP estimates.</p>
          </div>
          <div>
            <p className="mb-1.5"><strong className="text-foreground">Limitations:</strong> All figures are researcher estimates, not audited accounts. Economic channel data uses base-case scenarios; conservative and upside bounds are not shown in the current interface. Transfer effects (negative war costs) are noted per stakeholder but netted out at the global level. Multi-causal conflicts resist clean decomposition — attribution weights involve judgment.</p>
            <p className="mb-1.5"><strong className="text-foreground">Modeling framework:</strong> Follows the principle ΔW(s₁, s₀) = W(peace) − W(war) applied per stakeholder and per channel. See methodology page for full specification.</p>
            <p><strong className="text-foreground">Avoiding double-counting:</strong> The "Annual Peace Gain" ({fmtB(GLOBAL_PEACE_BENEFIT_B)}) is the correct war→peace swing. It decomposes into <em>cost reversal</em> ({fmtB(GLOBAL_COST_REVERSAL_B)} — conflict costs that stop) plus <em>peace dividend</em> ({fmtB(GLOBAL_PEACE_DIVIDEND_B)} — new economic activity above the pre-conflict baseline). Summing the conflict cost separately with the peace gain would double-count the cost-reversal component, which is already embedded in the peace gain figure.</p>
          </div>
        </div>
      </div>
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


      <ChannelCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChannelBreakdownChart />
        <StakeholderWaterfallChart stakeholders={STAKEHOLDERS} />
      </div>

      <CostTreemap />

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
              <option value="netSwingB">Sort: War→Peace Gain</option>
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
