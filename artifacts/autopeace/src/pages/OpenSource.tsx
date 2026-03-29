import React from "react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { Github, Code2, FileText, Database, Globe, FlaskConical, Users, Heart, BookOpen, ArrowRight } from "lucide-react";

const TECH_STACK = [
  { label: "Backend", items: ["Express 5", "TypeScript", "Drizzle ORM", "PostgreSQL"], icon: <Database className="w-4 h-4" /> },
  { label: "Frontend", items: ["React 19", "Vite", "TanStack Query", "Recharts"], icon: <Globe className="w-4 h-4" /> },
  { label: "AI Pipeline", items: ["Anthropic Claude", "OpenAI GPT-4o", "Google Gemini", "Multi-stage arbitration"], icon: <FlaskConical className="w-4 h-4" /> },
  { label: "Tooling", items: ["pnpm workspaces", "Orval (codegen)", "Zod validation", "OpenAPI 3.1"], icon: <Code2 className="w-4 h-4" /> },
];

const CONTRIB_AREAS = [
  {
    title: "Evidence Sources",
    description: "Add new evidence ingestion sources: RSS feeds, news APIs, UN resolution trackers, IAEA reports.",
    label: "Data",
  },
  {
    title: "Stakeholder Profiles",
    description: "Improve stakeholder profiles with more nuanced positions, red lines, and leverage points.",
    label: "Research",
  },
  {
    title: "Proposal Evaluators",
    description: "Build new AI evaluation rubrics or scoring dimensions (e.g. legal viability, precedent analysis).",
    label: "AI",
  },
  {
    title: "Forecast Models",
    description: "Integrate calibrated forecasting models or historical base rates to ground AI probability estimates.",
    label: "Modeling",
  },
  {
    title: "UI / Data Viz",
    description: "Improve charts, add scenario comparison tools, or build mobile-optimised views.",
    label: "Frontend",
  },
  {
    title: "Internationalisation",
    description: "Add Farsi, Hebrew, or Arabic translations to reach regional audiences.",
    label: "Translation",
  },
];

const BADGE_COLORS: Record<string, string> = {
  Data: "border-blue-700/40 text-blue-400",
  Research: "border-violet-700/40 text-violet-400",
  AI: "border-emerald-700/40 text-emerald-400",
  Modeling: "border-amber-700/40 text-amber-400",
  Frontend: "border-pink-700/40 text-pink-400",
  Translation: "border-orange-700/40 text-orange-400",
};

export default function OpenSource() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Open Source"
        description="AutoPeace is open research infrastructure — built collaboratively to make conflict analysis more transparent and accessible."
      >
        <a
          href="https://github.com/AutoPeace"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary border border-border/50 text-xs font-medium transition-colors"
          aria-label="View AutoPeace on GitHub (opens in new tab)"
        >
          <Github className="w-3.5 h-3.5" aria-hidden="true" /> View on GitHub
        </a>
      </PageHeader>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: <Code2 className="w-5 h-5 text-primary" />, label: "Open Source", desc: "Full codebase available under MIT licence" },
          { icon: <Database className="w-5 h-5 text-blue-400" />, label: "Open Data", desc: "All research data under CC BY 4.0" },
          { icon: <BookOpen className="w-5 h-5 text-violet-400" />, label: "Open Methodology", desc: "Every AI prompt and scoring rubric documented" },
        ].map(item => (
          <Card key={item.label} className="p-5 text-center">
            <div className="flex justify-center mb-2">{item.icon}</div>
            <h3 className="font-bold text-sm mb-1">{item.label}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" aria-hidden="true" /> Tech Stack
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {TECH_STACK.map(layer => (
            <div key={layer.label} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-muted-foreground">{layer.icon}</span>
                {layer.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {layer.items.map(item => (
                  <Badge key={item} variant="outline" className="text-[9px]">{item}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" aria-hidden="true" /> How to Contribute
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {CONTRIB_AREAS.map(area => (
            <Card key={area.title} className="p-4 space-y-2 hover:border-border/60 transition-colors">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{area.title}</h4>
                <Badge variant="outline" className={`text-[9px] ${BADGE_COLORS[area.label] ?? ""}`}>{area.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{area.description}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" aria-hidden="true" /> Getting Started
        </h3>
        <ol className="space-y-3 text-sm text-muted-foreground list-none">
          {[
            { step: "1", text: "Fork the repository on GitHub" },
            { step: "2", text: "Clone locally and install dependencies: pnpm install" },
            { step: "3", text: "Set environment variables (API keys, database URL)" },
            { step: "4", text: "Run the dev server: pnpm --filter @workspace/api-server run dev" },
            { step: "5", text: "Open a pull request with a clear description of your change" },
          ].map(item => (
            <li key={item.step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{item.step}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-4">
          <Heart className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="font-bold mb-1">Acknowledgements</h3>
            <p className="text-sm text-muted-foreground">
              AutoPeace builds on the work of conflict researchers, economists, and negotiators who study peace processes.
              This project is non-partisan and does not advocate for any political outcome — it exists to make structured
              analysis of conflict dynamics more accessible and transparent.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold mb-1">Licence</h3>
            <p className="text-sm text-muted-foreground">Source code: MIT. Research data and outputs: CC BY 4.0.</p>
          </div>
          <a
            href="https://github.com/AutoPeace"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            aria-label="Open GitHub profile (opens in new tab)"
          >
            <Github className="w-3.5 h-3.5" /> github.com/AutoPeace <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </Card>
    </div>
  );
}
