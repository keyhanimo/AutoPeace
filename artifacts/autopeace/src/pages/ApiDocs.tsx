import React, { useState, Suspense, lazy } from "react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { Code2, Copy, Check, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SwaggerWrapper = lazy(() => import("@/components/SwaggerWrapper"));

const BASE = typeof window !== "undefined"
  ? window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "")
  : "";

const SPEC_URL = `${BASE}/api/openapi.yaml`;

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  tags: string[];
  auth?: boolean;
  params?: { name: string; in: string; description: string; required?: boolean }[];
  example?: string;
};

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  POST: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  PATCH: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  DELETE: "bg-red-900/40 text-red-300 border-red-700/40",
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET", path: "/api/healthz", summary: "Check API health status",
    tags: ["system"],
    example: `curl "${BASE}/api/healthz"`,
  },

  {
    method: "GET", path: "/api/forecasts", summary: "List probability forecasts for all scenarios and time horizons",
    tags: ["forecasts"],
    params: [
      { name: "limit", in: "query", description: "Max records to return (default 20, max 100)" },
      { name: "offset", in: "query", description: "Number of records to skip for pagination" },
      { name: "timeHorizon", in: "query", description: "Filter by time horizon: 30d, 90d, 180d, or 1y" },
      { name: "cycleId", in: "query", description: "Filter by research cycle ID" },
    ],
    example: `curl "${BASE}/api/forecasts?timeHorizon=90d&limit=10"`,
  },
  {
    method: "GET", path: "/api/forecasts/latest", summary: "Get the latest forecast snapshot for each time horizon",
    tags: ["forecasts"],
    example: `curl "${BASE}/api/forecasts/latest"`,
  },
  {
    method: "GET", path: "/api/forecasts/calibration/curve", summary: "Get calibration curve and Brier score statistics",
    tags: ["forecasts"],
    example: `curl "${BASE}/api/forecasts/calibration/curve"`,
  },
  {
    method: "GET", path: "/api/forecasts/:id", summary: "Get a single forecast by ID",
    tags: ["forecasts"],
    params: [{ name: "id", in: "path", description: "Forecast UUID", required: true }],
    example: `curl "${BASE}/api/forecasts/{id}"`,
  },

  {
    method: "GET", path: "/api/deals", summary: "List all generated peace deals",
    tags: ["deals"],
    params: [
      { name: "limit", in: "query", description: "Max records to return (default 20, max 100)" },
      { name: "offset", in: "query", description: "Number of records to skip for pagination" },
      { name: "architecture", in: "query", description: "Filter by deal architecture type" },
    ],
    example: `curl "${BASE}/api/deals?limit=10"`,
  },
  {
    method: "GET", path: "/api/deals/current", summary: "Get the current best AI peace deal",
    tags: ["deals"],
    example: `curl "${BASE}/api/deals/current"`,
  },
  {
    method: "GET", path: "/api/deals/pareto", summary: "Get all Pareto-optimal deals (not dominated on any scoring dimension)",
    tags: ["deals"],
    example: `curl "${BASE}/api/deals/pareto"`,
  },
  {
    method: "GET", path: "/api/deals/tree", summary: "Get the solution tree of explored deal architectures",
    tags: ["deals"],
    example: `curl "${BASE}/api/deals/tree"`,
  },
  {
    method: "GET", path: "/api/deals/history", summary: "Get historical deal metadata (scores, architecture, cycle) without full terms",
    tags: ["deals"],
    params: [
      { name: "limit", in: "query", description: "Max records (default 50, max 200)" },
      { name: "offset", in: "query", description: "Number of records to skip for pagination" },
    ],
    example: `curl "${BASE}/api/deals/history?limit=20"`,
  },
  {
    method: "GET", path: "/api/deals/robustness", summary: "Get red-team robustness statistics across recent deals",
    tags: ["deals"],
    params: [
      { name: "n", in: "query", description: "Number of recent deals to sample (default 10, max 50)" },
    ],
    example: `curl "${BASE}/api/deals/robustness?n=10"`,
  },
  {
    method: "GET", path: "/api/deals/compare", summary: "Side-by-side comparison of 2\u201310 deals across all scoring dimensions",
    tags: ["deals"],
    params: [
      { name: "ids", in: "query", description: "Comma-separated deal IDs to compare (2\u201310)", required: true },
    ],
    example: `curl "${BASE}/api/deals/compare?ids=id1,id2,id3"`,
  },
  {
    method: "GET", path: "/api/deals/:id", summary: "Get a single deal by ID",
    tags: ["deals"],
    params: [{ name: "id", in: "path", description: "Deal UUID", required: true }],
    example: `curl "${BASE}/api/deals/{id}"`,
  },
  {
    method: "GET", path: "/api/deals/:id/stakeholder-evals", summary: "Get stakeholder evaluations, domestic evaluations, and negotiator amendments for a deal",
    tags: ["deals"],
    params: [{ name: "id", in: "path", description: "Deal UUID", required: true }],
    example: `curl "${BASE}/api/deals/{id}/stakeholder-evals"`,
  },

  {
    method: "GET", path: "/api/stakeholders", summary: "List all conflict stakeholder profiles",
    tags: ["stakeholders"],
    params: [
      { name: "role", in: "query", description: "Filter by stakeholder role" },
    ],
    example: `curl "${BASE}/api/stakeholders"`,
  },
  {
    method: "GET", path: "/api/stakeholders/tiers", summary: "Get stakeholder registry grouped by influence tier (required, critical, influential, contextual)",
    tags: ["stakeholders"],
    example: `curl "${BASE}/api/stakeholders/tiers"`,
  },
  {
    method: "GET", path: "/api/stakeholders/:id", summary: "Get a single stakeholder profile by ID",
    tags: ["stakeholders"],
    params: [{ name: "id", in: "path", description: "Stakeholder UUID", required: true }],
    example: `curl "${BASE}/api/stakeholders/{id}"`,
  },

  {
    method: "GET", path: "/api/costs", summary: "Get latest cost-of-war records (one per stakeholder)",
    tags: ["costs"],
    params: [
      { name: "stakeholderId", in: "query", description: "Filter by stakeholder ID" },
    ],
    example: `curl "${BASE}/api/costs"`,
  },
  {
    method: "GET", path: "/api/costs/:stakeholderId", summary: "Get cost-of-war record for a specific stakeholder",
    tags: ["costs"],
    params: [{ name: "stakeholderId", in: "path", description: "Stakeholder UUID", required: true }],
    example: `curl "${BASE}/api/costs/{stakeholderId}"`,
  },

  {
    method: "GET", path: "/api/evidence", summary: "List evidence corpus items with optional filters",
    tags: ["evidence"],
    params: [
      { name: "limit", in: "query", description: "Max records (default 20, max 100)" },
      { name: "offset", in: "query", description: "Number of records to skip for pagination" },
      { name: "source", in: "query", description: "Filter by evidence source name" },
      { name: "evidenceType", in: "query", description: "Filter by evidence type: military, diplomatic, economic, humanitarian" },
      { name: "stakeholderId", in: "query", description: "Filter by stakeholder relevance" },
    ],
    example: `curl "${BASE}/api/evidence?evidenceType=diplomatic&limit=20"`,
  },

  {
    method: "GET", path: "/api/experiments", summary: "List red-team experiment mutations",
    tags: ["experiments"],
    params: [
      { name: "limit", in: "query", description: "Max records (default 20, max 100)" },
      { name: "offset", in: "query", description: "Number of records to skip for pagination" },
      { name: "task", in: "query", description: "Filter by experiment task type" },
      { name: "cycleId", in: "query", description: "Filter by research cycle ID" },
      { name: "retained", in: "query", description: "Filter by retained status (true/false)" },
    ],
    example: `curl "${BASE}/api/experiments?limit=20"`,
  },
  {
    method: "GET", path: "/api/experiments/stats", summary: "Get aggregate experiment statistics (total, retention rate, cost, cycles run)",
    tags: ["experiments"],
    example: `curl "${BASE}/api/experiments/stats"`,
  },

  {
    method: "GET", path: "/api/scenarios", summary: "List what-if scenario snapshots",
    tags: ["scenarios"],
    example: `curl "${BASE}/api/scenarios"`,
  },

  {
    method: "GET", path: "/api/changelog", summary: "Changelog entries from research cycles",
    tags: ["changelog"],
    params: [
      { name: "limit", in: "query", description: "Max records (default 20, max 100)" },
      { name: "offset", in: "query", description: "Number of records to skip for pagination" },
    ],
    example: `curl "${BASE}/api/changelog"`,
  },
  {
    method: "GET", path: "/api/changelog.xml", summary: "RSS feed of changelog entries (returns XML, not JSON)",
    tags: ["changelog"],
    example: `curl "${BASE}/api/changelog.xml"`,
  },
  {
    method: "GET", path: "/api/changelog/:id", summary: "Get a single changelog entry by ID",
    tags: ["changelog"],
    params: [{ name: "id", in: "path", description: "Changelog entry UUID", required: true }],
    example: `curl "${BASE}/api/changelog/{id}"`,
  },

  {
    method: "GET", path: "/api/proposals", summary: "List all real-world proposals with scoring",
    tags: ["proposals"],
    example: `curl "${BASE}/api/proposals"`,
  },
  {
    method: "GET", path: "/api/proposals/arena", summary: "Get all proposals vs current AI deal for arena comparison",
    tags: ["proposals"],
    example: `curl "${BASE}/api/proposals/arena"`,
  },
  {
    method: "GET", path: "/api/proposals/:id", summary: "Get a single proposal by ID",
    tags: ["proposals"],
    params: [{ name: "id", in: "path", description: "Proposal UUID", required: true }],
    example: `curl "${BASE}/api/proposals/{id}"`,
  },

  {
    method: "GET", path: "/api/community-forecasts/aggregate", summary: "Get aggregated community probability forecast",
    tags: ["community"],
    params: [{ name: "timeHorizon", in: "query", description: "30d, 90d, 180d, or 1y" }],
    example: `curl "${BASE}/api/community-forecasts/aggregate?timeHorizon=90d"`,
  },

  {
    method: "GET", path: "/api/downloads/index", summary: "List all available data download endpoints",
    tags: ["downloads"],
    example: `curl "${BASE}/api/downloads/index"`,
  },
  {
    method: "GET", path: "/api/downloads/forecasts.json", summary: "Download all forecasts as JSON",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/forecasts.json"`,
  },
  {
    method: "GET", path: "/api/downloads/forecasts.csv", summary: "Download all forecasts as CSV",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/forecasts.csv"`,
  },
  {
    method: "GET", path: "/api/downloads/deals.json", summary: "Download all deals as JSON",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/deals.json"`,
  },
  {
    method: "GET", path: "/api/downloads/deals.csv", summary: "Download all deals as CSV",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/deals.csv"`,
  },
  {
    method: "GET", path: "/api/downloads/deals-pareto.json", summary: "Download Pareto frontier deals as JSON",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/deals-pareto.json"`,
  },
  {
    method: "GET", path: "/api/downloads/stakeholders.json", summary: "Download all stakeholder profiles as JSON",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/stakeholders.json"`,
  },
  {
    method: "GET", path: "/api/downloads/stakeholders.csv", summary: "Download all stakeholder profiles as CSV",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/stakeholders.csv"`,
  },
  {
    method: "GET", path: "/api/downloads/evidence.json", summary: "Download evidence corpus as JSON",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/evidence.json"`,
  },
  {
    method: "GET", path: "/api/downloads/evidence.csv", summary: "Download evidence corpus as CSV",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/evidence.csv"`,
  },
  {
    method: "GET", path: "/api/downloads/costs.json", summary: "Download cost-of-war records as JSON",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/costs.json"`,
  },
  {
    method: "GET", path: "/api/downloads/costs.csv", summary: "Download cost-of-war records as CSV",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/costs.csv"`,
  },
  {
    method: "GET", path: "/api/downloads/experiments.json", summary: "Download experiment log as JSON",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/experiments.json"`,
  },
  {
    method: "GET", path: "/api/downloads/experiments.csv", summary: "Download experiment log as CSV",
    tags: ["downloads"],
    example: `curl -O "${BASE}/api/downloads/experiments.csv"`,
  },
];

const ALL_TAGS = ["system", "forecasts", "deals", "stakeholders", "costs", "evidence", "experiments", "scenarios", "changelog", "proposals", "community", "downloads"];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group mt-2">
      <pre className="text-[10px] text-muted-foreground bg-secondary/50 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-secondary hover:bg-border transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Copy example command"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${METHOD_COLORS[ep.method]}`}>
          {ep.method}
        </span>
        <code className="text-xs font-mono text-foreground flex-1">{ep.path}</code>
        {ep.auth && (
          <span className="text-[9px] text-amber-400 border border-amber-700/40 rounded px-1.5 py-0.5" title="Requires admin key">🔒 Admin</span>
        )}
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/30"
          >
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-muted-foreground">{ep.summary}</p>
              {ep.params && ep.params.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Parameters</p>
                  <div className="space-y-1">
                    {ep.params.map(p => (
                      <div key={p.name} className="flex items-start gap-2 text-xs">
                        <code className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded font-mono shrink-0">{p.name}</code>
                        <span className="text-[10px] text-muted-foreground capitalize">{p.in}</span>
                        <span className="text-xs text-foreground/90">{p.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ep.example && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Example</p>
                  <CodeBlock code={ep.example} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ApiDocs() {
  const [view, setView] = useState<"reference" | "interactive">("reference");
  const [activeTag, setActiveTag] = useState("all");
  const filtered = activeTag === "all" ? ENDPOINTS : ENDPOINTS.filter(e => e.tags.includes(activeTag));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="API Documentation"
        description="All public API endpoints are available via REST. No authentication is required for read-only endpoints."
      >
        <a
          href={SPEC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          aria-label="View raw OpenAPI YAML spec in new tab"
        >
          <ExternalLink className="w-3 h-3" /> Raw OpenAPI spec (YAML)
        </a>
      </PageHeader>

      <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl w-fit">
        {(["reference", "interactive"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${v === view ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            aria-pressed={v === view}
          >
            {v === "reference" ? "Quick Reference" : "Interactive Explorer"}
          </button>
        ))}
      </div>

      {view === "interactive" ? (
        <div className="rounded-xl overflow-hidden border border-border/40 bg-white" style={{ minHeight: 600 }}>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading Swagger UI…</div>}>
            <SwaggerWrapper url={SPEC_URL} />
          </Suspense>
        </div>
      ) : (
        <>
      <Card className="p-4 border-blue-700/20 bg-blue-950/10">
        <div className="flex items-start gap-3">
          <Code2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Base URL</p>
            <code className="text-xs text-muted-foreground font-mono">{BASE}/api</code>
            <p className="text-xs text-muted-foreground mt-1">All responses are JSON except <code className="text-[10px] bg-secondary/60 px-1 rounded">/changelog.xml</code> which returns RSS/XML. Admin endpoints require <code className="text-[10px] bg-secondary/60 px-1 rounded">X-Admin-Key</code> header.</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTag("all")}
          className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${activeTag === "all" ? "bg-primary/20 border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:border-border"}`}
          aria-pressed={activeTag === "all"}
        >
          All ({ENDPOINTS.length})
        </button>
        {ALL_TAGS.map(tag => {
          const count = ENDPOINTS.filter(e => e.tags.includes(tag)).length;
          if (!count) return null;
          return (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${activeTag === tag ? "bg-primary/20 border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:border-border"}`}
              aria-pressed={activeTag === tag}
            >
              {tag} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.map(ep => <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />)}
      </div>
        </>
      )}
    </div>
  );
}
