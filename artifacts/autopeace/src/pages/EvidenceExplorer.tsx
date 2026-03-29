import React, { useState, useMemo } from "react";
import { useListEvidence, type EvidenceItem } from "@workspace/api-client-react";
import { Card, PageHeader, Badge, Button } from "@/components/ui";
import { Search, Filter, ExternalLink, ChevronDown, ChevronUp, Newspaper, Shield, DollarSign, Heart, Globe, Calendar, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  military: <Shield className="w-3 h-3" />,
  diplomatic: <Globe className="w-3 h-3" />,
  economic: <DollarSign className="w-3 h-3" />,
  humanitarian: <Heart className="w-3 h-3" />,
};

const TYPE_COLORS: Record<string, string> = {
  military: "border-red-700/40 text-red-400 bg-red-950/20",
  diplomatic: "border-blue-700/40 text-blue-400 bg-blue-950/20",
  economic: "border-amber-700/40 text-amber-400 bg-amber-950/20",
  humanitarian: "border-emerald-700/40 text-emerald-400 bg-emerald-950/20",
};

function parseStakeholderRelevance(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(x => typeof x === "string");
  if (typeof raw === "string") {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function EvidenceCard({ item, isHighInfluence }: { item: EvidenceItem; isHighInfluence?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = TYPE_COLORS[item.evidenceType] ?? "border-border text-muted-foreground";
  const stakeholders = parseStakeholderRelevance(item.stakeholderRelevance);

  return (
    <Card className={`p-4 hover:border-border/70 transition-colors ${isHighInfluence ? "ring-1 ring-amber-500/30 border-amber-700/30" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 text-muted-foreground">
          {TYPE_ICONS[item.evidenceType] ?? <Newspaper className="w-3 h-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-medium leading-tight">{item.title}</h3>
            {isHighInfluence && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-500/40 text-amber-400">★ High Influence</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${typeColor}`}>
              {TYPE_ICONS[item.evidenceType]} <span className="ml-1 capitalize">{item.evidenceType}</span>
            </Badge>
            {item.source && (
              <span className="text-[10px] text-muted-foreground">{item.source}</span>
            )}
            {item.publishedAt && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {stakeholders.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2" aria-label="Relevant stakeholders">
              <Users className="w-3 h-3 text-muted-foreground self-center shrink-0" />
              {stakeholders.map(s => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground border border-border/30">{s}</span>
              ))}
            </div>
          )}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {item.text && (
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed line-clamp-4">{item.text}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              aria-label={expanded ? "Collapse details" : "Expand details"}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Less" : "More"}
            </button>
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                aria-label="Open original source in new tab"
              >
                <ExternalLink className="w-3 h-3" /> Source
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function EvidenceExplorer() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStakeholder, setFilterStakeholder] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "influence">("date");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useListEvidence({ limit: 200, offset: 0 });
  const items = data?.data ?? [];

  const sources = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) { if (item.source) seen.add(item.source); }
    return Array.from(seen).sort();
  }, [items]);

  const allStakeholders = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      for (const s of parseStakeholderRelevance(item.stakeholderRelevance)) seen.add(s);
    }
    return Array.from(seen).sort();
  }, [items]);

  const highInfluenceIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const count = parseStakeholderRelevance(item.stakeholderRelevance).length;
      if (item.id) counts.set(item.id, count);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return new Set(sorted.slice(0, Math.ceil(sorted.length * 0.25)).map(([id]) => id));
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.filter(item => {
      if (filterType !== "all" && item.evidenceType !== filterType) return false;
      if (filterSource !== "all" && item.source !== filterSource) return false;
      if (filterStakeholder !== "all") {
        const relevant = parseStakeholderRelevance(item.stakeholderRelevance);
        if (!relevant.includes(filterStakeholder)) return false;
      }
      if (dateFrom && item.publishedAt) {
        if (new Date(item.publishedAt) < new Date(dateFrom)) return false;
      }
      if (dateTo && item.publishedAt) {
        if (new Date(item.publishedAt) > new Date(dateTo + "T23:59:59")) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.title?.toLowerCase().includes(q) &&
          !item.text?.toLowerCase().includes(q) &&
          !item.source?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
    if (sortBy === "influence") {
      result = [...result].sort((a, b) => {
        const aLen = parseStakeholderRelevance(a.stakeholderRelevance).length;
        const bLen = parseStakeholderRelevance(b.stakeholderRelevance).length;
        return bLen - aLen;
      });
    } else {
      result = [...result].sort((a, b) => {
        const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bt - at;
      });
    }
    return result;
  }, [items, filterType, filterSource, filterStakeholder, dateFrom, dateTo, search, sortBy]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handleType = (v: string) => { setFilterType(v); setPage(0); };
  const handleSource = (v: string) => { setFilterSource(v); setPage(0); };
  const handleStakeholder = (v: string) => { setFilterStakeholder(v); setPage(0); };
  const handleDateFrom = (v: string) => { setDateFrom(v); setPage(0); };
  const handleDateTo = (v: string) => { setDateTo(v); setPage(0); };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      if (item.evidenceType) {
        counts[item.evidenceType] = (counts[item.evidenceType] ?? 0) + 1;
      }
    }
    return counts;
  }, [items]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-card rounded-2xl" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-card rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Evidence Explorer"
        description="Browse and search the full evidence corpus powering AutoPeace's AI research pipeline."
      >
        <Badge variant="outline" className="border-primary/40 text-primary">
          {items.length} items
        </Badge>
      </PageHeader>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by title, excerpt, or source..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Search evidence items"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={e => handleType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Filter by evidence type"
          >
            <option value="all">All types ({items.length})</option>
            {["military", "diplomatic", "economic", "humanitarian"].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} ({typeCounts[t] ?? 0})</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={e => handleSource(e.target.value)}
            className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {allStakeholders.length > 0 && (
            <select
              value={filterStakeholder}
              onChange={e => handleStakeholder(e.target.value)}
              className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              aria-label="Filter by stakeholder relevance"
            >
              <option value="all">All stakeholders</option>
              {allStakeholders.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value as "date" | "influence"); setPage(0); }}
            className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Sort evidence items"
          >
            <option value="date">Sort: Newest</option>
            <option value="influence">Sort: Most Influential</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Date range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => handleDateFrom(e.target.value)}
            className="px-2 py-1 rounded-lg bg-secondary/50 border border-border/50 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Filter from date"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => handleDateTo(e.target.value)}
            className="px-2 py-1 rounded-lg bg-secondary/50 border border-border/50 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Filter to date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { handleDateFrom(""); handleDateTo(""); }}
              className="text-primary hover:underline"
              aria-label="Clear date range"
            >Clear</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["military", "diplomatic", "economic", "humanitarian"].map(t => (
          <button
            key={t}
            onClick={() => handleType(filterType === t ? "all" : t)}
            className={`p-3 rounded-xl border text-left transition-all ${filterType === t ? TYPE_COLORS[t] : "border-border/30 hover:border-border"}`}
            aria-pressed={filterType === t}
          >
            <div className="flex items-center gap-1.5 mb-1">{TYPE_ICONS[t]}<span className="text-xs font-medium capitalize">{t}</span></div>
            <div className="text-lg font-bold font-display">{typeCounts[t] ?? 0}</div>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Filter className="w-10 h-10 text-muted-foreground opacity-40 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">No results</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search term.</p>
        </Card>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} items
          </div>
          <div className="space-y-3">
            {paginated.map(item => (
              <EvidenceCard key={item.id} item={item} isHighInfluence={item.id ? highInfluenceIds.has(item.id) : false} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-center mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
