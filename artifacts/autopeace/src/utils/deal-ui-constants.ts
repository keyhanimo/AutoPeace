import type { DealScores } from "@workspace/api-client-react";

export const ARCHITECTURE_COLORS: Record<string, string> = {
  balanced: "#10b981",
  "nuclear-first": "#f59e0b",
  "hormuz-first": "#0284c7",
  "humanitarian-first": "#ec4899",
  "radical-restructure": "#a855f7",
  "asymmetric-grand-bargain": "#f97316",
  "incremental-confidence": "#14b8a6",
  freeform: "#e879f9",
};

export const SCORE_DIMENSIONS: { key: keyof DealScores; label: string; color: string; description: string; weight: number }[] = [
  { key: "feasibility", label: "Feasibility", color: "#10b981", description: "Likelihood the deal gets signed by all required parties", weight: 0.20 },
  { key: "coherence", label: "Coherence", color: "#0284c7", description: "Internal consistency — do terms contradict each other?", weight: 0.15 },
  { key: "evidenceGrounding", label: "Evidence", color: "#f59e0b", description: "How well terms reflect real-world constraints and evidence", weight: 0.10 },
  { key: "domesticSellability", label: "Domestic", color: "#8b5cf6", description: "Can leaders sell this domestically? (Congress, IRGC, Knesset)", weight: 0.20 },
  { key: "regionalStability", label: "Regional", color: "#06b6d4", description: "Impact on broader Middle East stability", weight: 0.15 },
  { key: "implementability", label: "Implement.", color: "#f97316", description: "Technical/logistical ease of executing the terms", weight: 0.10 },
  { key: "durability", label: "Durability", color: "#ec4899", description: "Resilience against future shocks or leadership changes", weight: 0.10 },
];

export function scoreColor(score: number): string {
  if (score >= 0.65) return "text-emerald-400";
  if (score >= 0.45) return "text-amber-400";
  return "text-red-400";
}

export function scoreLabel(score: number): string {
  if (score >= 0.65) return "Viable";
  if (score >= 0.45) return "Marginal";
  return "Weak";
}

export function safe(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return "[object]"; }
  }
  return String(v);
}

export const VERDICT_COLORS: Record<string, string> = {
  accept: "text-emerald-400 border-emerald-500/50 bg-emerald-950/20",
  conditional: "text-amber-400 border-amber-500/50 bg-amber-950/20",
  reject: "text-red-400 border-red-500/50 bg-red-950/20",
};
