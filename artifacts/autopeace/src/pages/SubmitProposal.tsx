import React, { useState } from "react";
import { useSubmitPublicProposal } from "@workspace/api-client-react";
import { Card, PageHeader, Badge, Button } from "@/components/ui";
import { Send, CheckCircle2, AlertTriangle, FileText, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TermEntry = { key: string; value: string };

export default function SubmitProposal() {
  const [submitterName, setSubmitterName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [summary, setSummary] = useState("");
  const [terms, setTerms] = useState<TermEntry[]>([{ key: "", value: "" }]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useSubmitPublicProposal();

  const addTerm = () => setTerms(prev => [...prev, { key: "", value: "" }]);
  const removeTerm = (i: number) => setTerms(prev => prev.filter((_, idx) => idx !== i));
  const setTerm = (i: number, field: "key" | "value", val: string) => {
    setTerms(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  };

  const validate = () => {
    if (!sourceUrl.trim()) return "Source URL is required.";
    if (!sourceName.trim()) return "Source name is required.";
    if (!summary.trim()) return "Summary is required.";
    if (summary.trim().length < 50) return "Summary must be at least 50 characters.";
    const validTerms = terms.filter(t => t.key.trim() && t.value.trim());
    if (validTerms.length === 0) return "At least one proposal term is required.";
    try { new URL(sourceUrl); } catch { return "Source URL must be a valid URL."; }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }

    const termsObj = Object.fromEntries(terms.filter(t => t.key.trim()).map(t => [t.key.trim(), t.value.trim()]));
    try {
      await mutateAsync({
        data: {
          submitterName: submitterName.trim() || undefined,
          sourceUrl: sourceUrl.trim(),
          sourceName: sourceName.trim(),
          summary: summary.trim(),
          terms: termsObj,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <PageHeader title="Submit a Proposal" description="" />
        <Card className="p-10 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold mb-2">Proposal Submitted</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Your proposal has been added to the review queue. Our team will evaluate it and, if approved, it will appear on the Proposal Arena for full AI scoring.
            </p>
            <Button
              variant="outline"
              onClick={() => { setSubmitted(false); setSourceUrl(""); setSourceName(""); setSummary(""); setTerms([{ key: "", value: "" }]); setSubmitterName(""); }}
            >
              Submit Another Proposal
            </Button>
          </motion.div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Submit a Proposal"
        description="Know of a real-world peace proposal not yet tracked by AutoPeace? Submit it for AI evaluation and community review."
      >
        <Badge variant="outline" className="border-amber-500/40 text-amber-400">
          <AlertTriangle className="w-3 h-3 mr-1" /> Reviewed by admins before publishing
        </Badge>
      </PageHeader>

      <Card className="p-5 border-blue-700/20 bg-blue-950/10">
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Submissions are reviewed before appearing publicly. Please link to credible sources (news outlets, official government releases, think-tank reports). After approval, the AI pipeline will score the proposal using all 7 dimensions.
          </p>
        </div>
      </Card>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-xl border border-red-700/40 bg-red-950/20 flex items-start gap-2"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm">Submitter (optional)</h3>
          <div>
            <label htmlFor="submitterName" className="text-xs text-muted-foreground block mb-1">Your name / organization</label>
            <input
              id="submitterName"
              type="text"
              value={submitterName}
              onChange={e => setSubmitterName(e.target.value)}
              placeholder="Anonymous"
              className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm">Proposal Source <span className="text-red-400">*</span></h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sourceName" className="text-xs text-muted-foreground block mb-1">Source name (e.g. Reuters, UN Report)</label>
              <input
                id="sourceName"
                type="text"
                value={sourceName}
                onChange={e => setSourceName(e.target.value)}
                placeholder="Reuters"
                required
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="sourceUrl" className="text-xs text-muted-foreground block mb-1">Source URL</label>
              <input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-required="true"
              />
            </div>
          </div>
          <div>
            <label htmlFor="summary" className="text-xs text-muted-foreground block mb-1">
              Summary of the proposal <span className="text-red-400">*</span> (min 50 chars)
            </label>
            <textarea
              id="summary"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={5}
              placeholder="Describe the proposal's key elements: parties involved, main concessions, timeline, verification mechanisms..."
              required
              className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/50"
              aria-required="true"
              aria-describedby="summary-count"
            />
            <p id="summary-count" className="text-[10px] text-muted-foreground mt-1">{summary.length} characters (minimum 50)</p>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Proposal Terms <span className="text-red-400">*</span></h3>
            <button
              type="button"
              onClick={addTerm}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              aria-label="Add another term"
            >
              <Plus className="w-3 h-3" /> Add term
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Key-value pairs describing the proposal's specific terms (e.g. "Uranium enrichment level" → "5%").</p>
          <div className="space-y-2">
            {terms.map((t, i) => (
              <div key={i} className="flex gap-2 items-start" role="group" aria-label={`Term ${i + 1}`}>
                <input
                  type="text"
                  value={t.key}
                  onChange={e => setTerm(i, "key", e.target.value)}
                  placeholder="Term (e.g. Enrichment cap)"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  aria-label={`Term ${i + 1} name`}
                />
                <input
                  type="text"
                  value={t.value}
                  onChange={e => setTerm(i, "value", e.target.value)}
                  placeholder="Value (e.g. 5%)"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  aria-label={`Term ${i + 1} value`}
                />
                {terms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTerm(i)}
                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                    aria-label={`Remove term ${i + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} className="gap-2 min-w-[140px]">
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                Submitting…
              </span>
            ) : (
              <>
                <Send className="w-4 h-4" aria-hidden="true" />
                Submit Proposal
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
