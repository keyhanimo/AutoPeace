import React, { useState } from "react";
import { useSubmitPublicProposal, useScreenProposal } from "@workspace/api-client-react";
import { Card, PageHeader, Badge, Button } from "@/components/ui";
import { Send, CheckCircle2, AlertTriangle, FileText, Plus, Trash2, ShieldAlert, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TermEntry = { key: string; value: string };

type ScreeningState = "idle" | "screening" | "rejected" | "passed";

export default function SubmitProposal() {
  const [submitterName, setSubmitterName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [summary, setSummary] = useState("");
  const [terms, setTerms] = useState<TermEntry[]>([{ key: "", value: "" }]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screeningState, setScreeningState] = useState<ScreeningState>("idle");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const { mutateAsync: submitMutation, isPending: isSubmitting } = useSubmitPublicProposal();
  const { mutateAsync: screenMutation } = useScreenProposal();

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
    setRejectionReason(null);
    setScreeningState("idle");
    const err = validate();
    if (err) { setError(err); return; }

    const termsObj = Object.fromEntries(terms.filter(t => t.key.trim()).map(t => [t.key.trim(), t.value.trim()]));

    setScreeningState("screening");
    try {
      const screenResult = await screenMutation({
        data: {
          summary: summary.trim(),
          terms: termsObj,
        },
      });

      if (!screenResult.eligible) {
        setScreeningState("rejected");
        setRejectionReason(screenResult.reason);
        return;
      }

      setScreeningState("passed");
    } catch {
      setScreeningState("passed");
    }

    try {
      await submitMutation({
        data: {
          submitterName: submitterName.trim() || undefined,
          sourceUrl: sourceUrl.trim(),
          sourceName: sourceName.trim(),
          summary: summary.trim(),
          terms: termsObj,
        },
      });
      setSubmitted(true);
    } catch (submitErr: unknown) {
      const apiErr = submitErr as { status?: number; data?: { eligible?: boolean; reason?: string; error?: string } };
      if (apiErr.status === 422 && apiErr.data?.eligible === false && apiErr.data?.reason) {
        setScreeningState("rejected");
        setRejectionReason(apiErr.data.reason);
        return;
      }
      if (submitErr instanceof Error) {
        setError(submitErr.message);
      } else {
        setError("Submission failed. Please try again.");
      }
      setScreeningState("idle");
    }
  };

  const isBusy = screeningState === "screening" || isSubmitting;

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
              onClick={() => { setSubmitted(false); setSourceUrl(""); setSourceName(""); setSummary(""); setTerms([{ key: "", value: "" }]); setSubmitterName(""); setScreeningState("idle"); setRejectionReason(null); }}
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

        <AnimatePresence>
          {screeningState === "rejected" && rejectionReason && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-5 rounded-xl border border-red-700/40 bg-red-950/20 space-y-3"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400 shrink-0" aria-hidden="true" />
                <h3 className="font-bold text-sm text-red-400">Proposal Not Eligible for Submission</h3>
              </div>
              <p className="text-sm text-red-300/90 pl-7">{rejectionReason}</p>
              <p className="text-xs text-muted-foreground pl-7">
                Please revise your proposal and try again. Ensure it is a genuine, real-world peace proposal with concrete terms.
              </p>
              <div className="pl-7">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setScreeningState("idle"); setRejectionReason(null); }}
                  className="text-xs"
                >
                  Dismiss and Edit
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {screeningState === "screening" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-5 rounded-xl border border-blue-700/40 bg-blue-950/20 flex items-center gap-3"
              role="status"
            >
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-bold text-sm text-blue-400">Screening Your Proposal</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Our AI is checking your proposal for eligibility before submission...</p>
              </div>
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
          <p className="text-xs text-muted-foreground">List the specific terms of the proposal. Each term has a topic and its specification.</p>
          <div className="space-y-2">
            <div className="flex gap-2 px-1">
              <span className="flex-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">Topic</span>
              <span className="flex-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">Specification</span>
              <span className="w-8" />
            </div>
            {terms.map((t, i) => (
              <div key={i} className="flex gap-2 items-start" role="group" aria-label={`Term ${i + 1}`}>
                <input
                  type="text"
                  value={t.key}
                  onChange={e => setTerm(i, "key", e.target.value)}
                  placeholder="e.g. Uranium enrichment cap"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  aria-label={`Term ${i + 1} topic`}
                />
                <input
                  type="text"
                  value={t.value}
                  onChange={e => setTerm(i, "value", e.target.value)}
                  placeholder="e.g. Limited to 3.67% LEU"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  aria-label={`Term ${i + 1} specification`}
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
          <Button type="submit" disabled={isBusy || screeningState === "rejected"} className="gap-2 min-w-[140px]">
            {isBusy ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                {screeningState === "screening" ? "Screening…" : "Submitting…"}
              </span>
            ) : (
              <>
                <Send className="w-4 h-4" aria-hidden="true" />
                Submit Proposal for AI Screening
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
