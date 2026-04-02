import React from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader, Badge, Button } from "@/components/ui";
import { Download, FileJson, FileText, Database, Globe, FlaskConical, DollarSign, Newspaper, Handshake } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api/downloads`;

type Dataset = {
  id: string;
  name: string;
  description: string;
  urlJson?: string;
  urlCsv?: string;
  icon: React.ReactNode;
  tag: string;
};

const DATASETS: Dataset[] = [
  {
    id: "forecasts",
    name: "Forecasts",
    description: "All AI-generated probability forecasts for 8 conflict outcomes across 5 time horizons.",
    urlJson: `${API}/forecasts.json`,
    urlCsv: `${API}/forecasts.csv`,
    icon: <Globe className="w-4 h-4" />,
    tag: "Task A",
  },
  {
    id: "deals",
    name: "AI Peace Deals",
    description: "All AI-generated peace deal proposals with 7-dimension scores, innovative provisions, stakeholder verdicts, and red-team results.",
    urlJson: `${API}/deals.json`,
    urlCsv: `${API}/deals.csv`,
    icon: <Handshake className="w-4 h-4" />,
    tag: "Task B",
  },
  {
    id: "deals-pareto",
    name: "Pareto Frontier Deals",
    description: "Subset of AI peace deals that are not dominated on any scoring dimension — the key dataset for optimal deal analysis.",
    urlJson: `${API}/deals-pareto.json`,
    icon: <Handshake className="w-4 h-4" />,
    tag: "Task B",
  },
  {
    id: "experiments",
    name: "Experiment Log",
    description: "Red-team mutation records showing which forecast mutations were accepted or rejected and why.",
    urlJson: `${API}/experiments.json`,
    urlCsv: `${API}/experiments.csv`,
    icon: <FlaskConical className="w-4 h-4" />,
    tag: "Task A",
  },
  {
    id: "stakeholders",
    name: "Stakeholder Profiles",
    description: "Complete profiles for all 32+ conflict actors including roles, interests, red lines, and leverage.",
    urlJson: `${API}/stakeholders.json`,
    urlCsv: `${API}/stakeholders.csv`,
    icon: <Database className="w-4 h-4" />,
    tag: "Reference",
  },
  {
    id: "evidence",
    name: "Evidence Corpus",
    description: "Recent evidence items ingested from RSS feeds, classified by type (military, diplomatic, economic, humanitarian).",
    urlJson: `${API}/evidence.json`,
    urlCsv: `${API}/evidence.csv`,
    icon: <Newspaper className="w-4 h-4" />,
    tag: "Task A",
  },
  {
    id: "costs",
    name: "Cost-of-War Records",
    description: "Economic and human cost data for Iran, US, and Israel across multiple dimensions and scenarios.",
    urlJson: `${API}/costs.json`,
    urlCsv: `${API}/costs.csv`,
    icon: <DollarSign className="w-4 h-4" />,
    tag: "Task A",
  },
];

export default function DataPortal() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Data Portal"
        description="Download AutoPeace research data in JSON or CSV format for your own analysis."
      >
        <Badge variant="outline" className="border-primary/40 text-primary">
          {DATASETS.length} datasets
        </Badge>
      </PageHeader>

      <Card className="p-5 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="font-bold mb-1">Open Data Policy</h3>
            <p className="text-sm text-muted-foreground">
              All AutoPeace datasets are released under{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                CC BY 4.0
              </a>. You are free to use, share, and adapt the data for any purpose with attribution.
              Data represents AI-generated research outputs — see the{" "}
              <Link to="/methodology" className="text-primary hover:underline">Methodology</Link> page for accuracy caveats.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {DATASETS.map(ds => (
          <Card key={ds.id} className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">{ds.icon}</span>
                <div>
                  <h3 className="font-bold text-sm">{ds.name}</h3>
                  <Badge variant="outline" className="text-[9px] mt-0.5">{ds.tag}</Badge>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{ds.description}</p>
            <div className="flex gap-2 flex-wrap">
              {ds.urlJson && (
                <a
                  href={ds.urlJson}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-xs font-medium border border-border/50 transition-colors"
                  aria-label={`Download ${ds.name} as JSON`}
                >
                  <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                  JSON
                  <Download className="w-3 h-3 opacity-60" aria-hidden="true" />
                </a>
              )}
              {ds.urlCsv && (
                <a
                  href={ds.urlCsv}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-xs font-medium border border-border/50 transition-colors"
                  aria-label={`Download ${ds.name} as CSV`}
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  CSV
                  <Download className="w-3 h-3 opacity-60" aria-hidden="true" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" /> RSS Feed
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Subscribe to the AutoPeace changelog RSS feed to receive updates whenever a new research cycle completes.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`${BASE}/api/changelog.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-900/30 border border-orange-700/40 text-orange-400 text-xs font-medium hover:bg-orange-900/50 transition-colors"
            aria-label="Subscribe to RSS feed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
            </svg>
            Subscribe via RSS
          </a>
          <code className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
            {window.location.origin}{BASE}/api/changelog.xml
          </code>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold mb-3">API Access</h3>
        <p className="text-sm text-muted-foreground mb-3">
          All data is available via the public REST API. See the full API documentation for request formats and available parameters.
        </p>
        <Link to="/api-docs">
          <Button size="sm" variant="outline" className="gap-2">
            View API Documentation
          </Button>
        </Link>
      </Card>
    </div>
  );
}
