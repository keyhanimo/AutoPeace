import React, { useState } from "react";
import { 
  useGetAdminConfig, 
  useUpdateAdminConfig, 
  useTriggerRun,
  useTriggerDealRun,
  useListEvidenceSources,
  useGetAdminCostsSummary,
  useGetCurrentDeal,
  useListProposals,
  type AdminConfigResponse,
  type AdminConfigUpdate,
  type DealScores,
} from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminKey } from "@/hooks/use-admin";
import { PageHeader, Card, Button, Input, Badge } from "@/components/ui";
import { Lock, Play, Save, LogOut, Loader2, DollarSign, ToggleLeft, ToggleRight, Handshake, GitBranch, Cpu, Zap, CheckCircle2, AlertCircle, Plus, X, Inbox, CheckSquare, XSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatUsd } from "@/lib/utils";

export default function AdminPanel() {
  const { adminKey, saveKey, clearKey } = useAdminKey();
  const [inputKey, setInputKey] = useState("");
  const { toast } = useToast();

  const authHeaders = { 'X-Admin-Key': adminKey };

  const { data: config, isLoading: isConfigLoading, isError: isConfigError, refetch } = useGetAdminConfig({
    request: { headers: authHeaders },
    query: { enabled: !!adminKey, retry: false, queryKey: ['admin-config', adminKey] },
  });

  const { data: sources } = useListEvidenceSources({ request: { headers: authHeaders } });
  const { data: costSummary } = useGetAdminCostsSummary({ request: { headers: authHeaders } });

  const updateConfig = useUpdateAdminConfig({ request: { headers: authHeaders } });
  const runTrigger = useTriggerRun({ request: { headers: authHeaders } });
  const dealRunTrigger = useTriggerDealRun({ request: { headers: authHeaders } });
  const { data: currentDeal } = useGetCurrentDeal();
  const { data: proposalsData, refetch: refetchProposals } = useListProposals();

  type DealCycle = {
    cycleId: string; status: string; dealsCount: number;
    bestComposite: number; architectures: string[];
    tokensConsumed: number; costUsd: number; startedAt: string;
  };
  const { data: dealCyclesData, refetch: refetchDealCycles } = useQuery<{ data: DealCycle[]; currentlyRunning: boolean }>({
    queryKey: ['/api/admin/deal-cycles', adminKey],
    queryFn: async () => {
      const res = await fetch('/api/admin/deal-cycles', { headers: { 'X-Admin-Key': adminKey } });
      if (!res.ok) throw new Error('Failed to fetch deal cycles');
      return res.json() as Promise<{ data: DealCycle[]; currentlyRunning: boolean }>;
    },
    enabled: !!adminKey,
    refetchInterval: (query) => (query.state.data?.currentlyRunning ? 5000 : false),
  });

  const queryClient = useQueryClient();
  const toggleSource = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: "Source updated", description: "Evidence source toggled successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [evaluatingProposals, setEvaluatingProposals] = useState(false);
  const [evalResults, setEvalResults] = useState<{ id: string; name: string; ok: boolean }[]>([]);

  const handleEvaluateAllProposals = async () => {
    const proposals = proposalsData?.data ?? [];
    if (proposals.length === 0) {
      toast({ title: "No proposals", description: "No proposals found to evaluate." });
      return;
    }
    setEvaluatingProposals(true);
    setEvalResults([]);
    const results: { id: string; name: string; ok: boolean }[] = [];
    for (const proposal of proposals) {
      try {
        const res = await fetch(`/api/admin/proposals/${proposal.id}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        });
        results.push({ id: proposal.id, name: proposal.name, ok: res.ok });
      } catch {
        results.push({ id: proposal.id, name: proposal.name, ok: false });
      }
    }
    setEvalResults(results);
    setEvaluatingProposals(false);
    void refetchProposals();
    toast({ title: "Evaluation complete", description: `Evaluated ${results.length} proposal(s).` });
  };

  const [formData, setFormData] = useState<AdminConfigUpdate>({});
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalFormData, setProposalFormData] = useState({
    name: "", source: "", summary: "",
    nuclearProtocol: "", sanctionsRelief: "", hormuzArrangements: "",
    humanitarianProvisions: "", verificationMechanism: "", timelineYears: 5,
    sequencing: "",
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);

  type QueueItem = {
    id: string; sourceName: string; submitterName: string; summary: string;
    status: string; submittedAt: string; adminNotes: string | null;
  };
  const [queueFilter, setQueueFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [queueNotes, setQueueNotes] = useState<Record<string, string>>({});
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState<string>("");
  const { data: queueData, refetch: refetchQueue } = useQuery<{ data: QueueItem[]; total: number }>({
    queryKey: ['/api/admin/proposals/queue', queueFilter, adminKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/proposals/queue?status=${queueFilter}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) throw new Error('Failed to fetch queue');
      return res.json() as Promise<{ data: QueueItem[]; total: number }>;
    },
    enabled: !!adminKey,
  });

  const handleQueueAction = async (id: string, action: "approve" | "reject") => {
    setActingOn(id);
    try {
      const res = await fetch(`/api/admin/proposals/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({ action, adminNotes: queueNotes[id] ?? "" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json() as { message: string };
      toast({ title: action === "approve" ? "Approved" : "Rejected", description: result.message });
      void refetchQueue();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Action failed.", variant: "destructive" });
    } finally {
      setActingOn(null);
    }
  };

  const handleSaveTermsEdit = async (id: string) => {
    setActingOn(id);
    try {
      const res = await fetch(`/api/admin/proposals/queue/${id}/terms`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({ summary: editSummary }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Saved", description: "Submission summary updated." });
      setEditingId(null);
      void refetchQueue();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Save failed.", variant: "destructive" });
    } finally {
      setActingOn(null);
    }
  };

  const handleAddProposal = async () => {
    if (!proposalFormData.name || !proposalFormData.summary) {
      toast({ title: "Validation Error", description: "Name and Summary are required.", variant: "destructive" });
      return;
    }
    setSubmittingProposal(true);
    try {
      const res = await fetch(`/api/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify({
          name: proposalFormData.name,
          source: proposalFormData.source || "Unknown",
          submittedBy: "human",
          summary: proposalFormData.summary,
          terms: {
            nuclearProtocol: proposalFormData.nuclearProtocol,
            sanctionsRelief: proposalFormData.sanctionsRelief,
            hormuzArrangements: proposalFormData.hormuzArrangements,
            humanitarianProvisions: proposalFormData.humanitarianProvisions,
            verificationMechanism: proposalFormData.verificationMechanism,
            timelineYears: proposalFormData.timelineYears,
            sequencing: proposalFormData.sequencing,
            additionalClauses: [],
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Proposal added", description: `"${proposalFormData.name}" created and queued for evaluation.` });
      setShowProposalForm(false);
      setProposalFormData({ name: "", source: "", summary: "", nuclearProtocol: "", sanctionsRelief: "", hormuzArrangements: "", humanitarianProvisions: "", verificationMechanism: "", timelineYears: 5, sequencing: "" });
      void refetchProposals();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create proposal.", variant: "destructive" });
    } finally {
      setSubmittingProposal(false);
    }
  };

  React.useEffect(() => {
    if (config) {
      const cfg = config as AdminConfigResponse & Record<string, string | undefined>;
      const stageFields: Partial<AdminConfigUpdate> = {};
      for (let s = 1; s <= 8; s++) {
        const pk = `stage${s}Provider` as keyof AdminConfigUpdate;
        const mk = `stage${s}Model` as keyof AdminConfigUpdate;
        if (cfg[pk]) (stageFields as Record<string, unknown>)[pk] = cfg[pk];
        if (cfg[mk]) (stageFields as Record<string, unknown>)[mk] = cfg[mk];
      }
      setFormData({
        cadence: config.cadence,
        budgetCapUsd: config.budgetCapUsd,
        isPaused: config.isPaused,
        anthropicModel: config.anthropicModel,
        openaiModel: config.openaiModel,
        geminiModel: config.geminiModel,
        generationProvider: config.generationProvider as AdminConfigUpdate["generationProvider"],
        generationModel: config.generationModel,
        evaluationProvider: config.evaluationProvider as AdminConfigUpdate["evaluationProvider"],
        evaluationModel: config.evaluationModel,
        adversarialProvider: config.adversarialProvider as AdminConfigUpdate["adversarialProvider"],
        adversarialModel: config.adversarialModel,
        ...stageFields,
      });
    }
  }, [config]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    saveKey(inputKey);
  };

  const handleSaveConfig = async () => {
    try {
      await updateConfig.mutateAsync({ data: formData });
      toast({ title: "Config saved", description: "Settings updated successfully." });
      refetch();
    } catch (e) {
      toast({ title: "Error", description: "Failed to save config.", variant: "destructive" });
    }
  };

  const handleRun = async () => {
    try {
      await runTrigger.mutateAsync();
      toast({ title: "Run Triggered", description: "Autoresearch loop started in background." });
    } catch (e) {
      toast({ title: "Trigger Failed", description: "Could not start loop or already running.", variant: "destructive" });
    }
  };

  const handleDealRun = async () => {
    try {
      await dealRunTrigger.mutateAsync();
      toast({ title: "Deal Cycle Started", description: "Task B deal engine running in background." });
    } catch (e) {
      toast({ title: "Deal Run Failed", description: "Could not start deal cycle or already running.", variant: "destructive" });
    }
  };

  const isUnauthorized = !!adminKey && isConfigError;

  if (!adminKey || isUnauthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <Card className="w-full max-w-md p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-destructive via-orange-500 to-primary" />
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-secondary flex items-center justify-center mb-4 border border-border">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold">Admin Access</h1>
            <p className="text-muted-foreground mt-2 text-sm">Enter the master key to configure the forecasting pipeline.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              type="password" 
              placeholder="X-Admin-Key" 
              value={inputKey} 
              onChange={e => setInputKey(e.target.value)} 
              className="text-center text-lg"
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full">Authenticate</Button>
            {isUnauthorized && (
              <p className="text-destructive text-sm text-center font-medium mt-2">
                Invalid key. <button type="button" onClick={clearKey} className="underline hover:no-underline">Clear stored key</button>
              </p>
            )}
          </form>
        </Card>
      </div>
    );
  }

  if (isConfigLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader 
        title="Command Center" 
        description="Manage LLM models, budget caps, and pipeline state."
      >
        <div className="flex gap-2 flex-wrap">
          <Button variant="destructive" onClick={handleRun} disabled={runTrigger.isPending} className="gap-2">
            {runTrigger.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Force Forecast Run
          </Button>
          <Button onClick={handleDealRun} disabled={dealRunTrigger.isPending} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0">
            {dealRunTrigger.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
            Run Deal Cycle
          </Button>
          <Button variant="outline" onClick={clearKey} title="Log out"><LogOut className="w-4 h-4" /></Button>
        </div>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">Pipeline Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Cadence</label>
                <select 
                  className="w-full h-10 border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formData.cadence ?? 'daily'}
                  onChange={e => setFormData({...formData, cadence: e.target.value as AdminConfigResponse['cadence']})}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Budget Cap (USD)</label>
                <Input 
                  type="number" 
                  value={formData.budgetCapUsd ?? 0}
                  onChange={e => setFormData({...formData, budgetCapUsd: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Anthropic Forecaster Model</label>
                <Input 
                  value={formData.anthropicModel ?? ''}
                  onChange={e => setFormData({...formData, anthropicModel: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">OpenAI Evaluator Model</label>
                <Input 
                  value={formData.openaiModel ?? ''}
                  onChange={e => setFormData({...formData, openaiModel: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Gemini Red-Team Model</label>
                <Input 
                  value={formData.geminiModel ?? ''}
                  onChange={e => setFormData({...formData, geminiModel: e.target.value})}
                />
              </div>
              <div className="space-y-2 flex items-center h-full pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 border-border text-primary focus:ring-primary/50 bg-background"
                    checked={formData.isPaused ?? false}
                    onChange={e => setFormData({...formData, isPaused: e.target.checked})}
                  />
                  <span className="text-sm font-medium">Pause Autoresearch Loop</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveConfig} disabled={updateConfig.isPending} className="gap-2">
                {updateConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" /> Model Assignment by Role
            </h3>
            <div className="space-y-4 mb-4">
              {(["generation", "evaluation", "adversarial"] as const).map(role => {
                const providerKey = `${role}Provider` as "generationProvider" | "evaluationProvider" | "adversarialProvider";
                const modelKey = `${role}Model` as "generationModel" | "evaluationModel" | "adversarialModel";
                const providerVal = (formData[providerKey] ?? config?.[providerKey] ?? (role === "generation" ? "anthropic" : role === "evaluation" ? "openai" : "gemini")) as string;
                const modelVal = formData[modelKey] ?? config?.[modelKey] ?? "";
                const roleLabel = role === "generation" ? "Generation (Stages 1, 5)" : role === "evaluation" ? "Evaluation (Stages 2, 3, 6, 7)" : "Adversarial (Stages 4, 8)";
                const roleColor = role === "generation" ? "text-violet-400" : role === "evaluation" ? "text-blue-400" : "text-orange-400";
                return (
                  <div key={role} className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={`text-xs font-semibold ${roleColor}`}>{roleLabel} — Provider</label>
                      <select
                        className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={providerVal}
                        onChange={e => setFormData({ ...formData, [providerKey]: e.target.value as "anthropic" | "openai" | "gemini" })}
                      >
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="openai">OpenAI (GPT)</option>
                        <option value="gemini">Google (Gemini)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Model Name</label>
                      <Input
                        value={modelVal}
                        onChange={e => setFormData({ ...formData, [modelKey]: e.target.value })}
                        placeholder={role === "generation" ? "claude-sonnet-4-5" : role === "evaluation" ? "gpt-4o" : "gemini-2.5-flash"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="overflow-x-auto border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Per-agent overrides take priority over role defaults above. Leave blank to inherit from role bucket.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <th className="pb-2 pr-2 font-semibold w-6">#</th>
                    <th className="pb-2 pr-3 font-semibold">Agent</th>
                    <th className="pb-2 pr-3 font-semibold">Default Role</th>
                    <th className="pb-2 pr-3 font-semibold">Override Provider</th>
                    <th className="pb-2 font-semibold">Override Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {([
                    [1, "Proposal Agent", "generation"],
                    [2, "Stakeholder Evaluator", "evaluation"],
                    [3, "Domestic Audiences", "evaluation"],
                    [4, "Red-Team Agent", "adversarial"],
                    [5, "Negotiator Agent", "generation"],
                    [6, "Judge Agent", "evaluation"],
                    [7, "Meta-Evaluator", "evaluation"],
                    [8, "Diagnosis Generator", "adversarial"],
                  ] as [number, string, string][]).map(([stage, name, role]) => {
                    const provKey = `stage${stage}Provider` as keyof AdminConfigUpdate;
                    const modelKey = `stage${stage}Model` as keyof AdminConfigUpdate;
                    const provVal = (formData[provKey] ?? "") as string;
                    const modelVal = (formData[modelKey] ?? "") as string;
                    const hasOverride = !!provVal && !!modelVal;
                    return (
                      <tr key={stage} className={`hover:bg-secondary/20 transition-colors ${hasOverride ? "bg-violet-950/10" : ""}`}>
                        <td className="py-1.5 pr-2 font-mono text-muted-foreground">{stage}</td>
                        <td className="py-1.5 pr-3 font-medium">
                          {name}
                          {hasOverride && <span className="ml-1 text-[9px] text-violet-400 font-semibold">●</span>}
                        </td>
                        <td className="py-1.5 pr-3">
                          <Badge variant="outline" className={`text-[9px] ${
                            role === "generation" ? "border-violet-700/40 text-violet-400" :
                            role === "evaluation" ? "border-blue-700/40 text-blue-400" :
                            "border-orange-700/40 text-orange-400"
                          }`}>{role}</Badge>
                        </td>
                        <td className="py-1.5 pr-3">
                          <select
                            className="w-28 h-7 rounded-lg border border-border bg-background/50 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            value={provVal}
                            onChange={e => setFormData(f => ({ ...f, [provKey]: e.target.value || undefined }))}
                          >
                            <option value="">— role default —</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="openai">OpenAI</option>
                            <option value="gemini">Gemini</option>
                          </select>
                        </td>
                        <td className="py-1.5">
                          <input
                            className="w-36 h-7 rounded-lg border border-border bg-background/50 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="e.g. gpt-4o"
                            value={modelVal}
                            onChange={e => setFormData(f => ({ ...f, [modelKey]: e.target.value || undefined }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {formData.generationProvider === formData.evaluationProvider && formData.generationProvider && (
              <p className="text-xs text-red-400 mt-3 bg-red-950/20 border border-red-700/30 rounded-lg px-3 py-2">
                ✗ Generation and evaluation role providers must differ — save will be rejected by the server.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2 bg-amber-950/20 border border-amber-700/30 rounded-lg px-3 py-2">
              ⚠ Generation and evaluation role providers must use different providers (enforced at save time). Per-agent overrides (● rows) still respect this constraint — a stage override cannot place the same provider in both generation and evaluation roles.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Proposal Evaluation
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Run the multi-agent evaluation pipeline on all seeded proposals. This calls stakeholder evaluator, judge, and what-would-it-take on each proposal.
            </p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                {proposalsData?.data?.length ?? 0} proposal(s) loaded
                {proposalsData?.data?.filter(p => p.scores).length
                  ? ` · ${proposalsData.data?.filter(p => p.scores).length} already evaluated`
                  : ""}
              </span>
            </div>
            {evalResults.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {evalResults.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    {r.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className={r.ok ? "text-emerald-300" : "text-red-300"}>{r.name}</span>
                    <span className="text-muted-foreground ml-auto">{r.ok ? "evaluated" : "failed"}</span>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={handleEvaluateAllProposals}
              disabled={evaluatingProposals}
              className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0"
            >
              {evaluatingProposals
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating proposals...</>
                : <><Zap className="w-4 h-4" /> Evaluate All Proposals</>}
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Inbox className="w-5 h-5 text-blue-400" /> Community Submission Queue
              </h3>
              <div className="flex gap-1">
                {(["pending", "approved", "rejected"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize border transition-all ${
                      queueFilter === f ? "border-primary/50 bg-primary/10 text-primary" : "border-border/30 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {(queueData?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No {queueFilter} submissions.
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(queueData?.data ?? []).map(item => (
                  <div key={item.id} className="border border-border/40 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.sourceName}</p>
                        <p className="text-xs text-muted-foreground">
                          by {item.submitterName} · {new Date(item.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${
                        item.status === "approved" ? "border-green-700/40 text-green-400"
                        : item.status === "rejected" ? "border-red-700/40 text-red-400"
                        : "border-amber-700/40 text-amber-400"
                      }`}>
                        {item.status}
                      </Badge>
                    </div>
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Edit Summary</label>
                        <textarea
                          rows={3}
                          value={editSummary}
                          onChange={e => setEditSummary(e.target.value)}
                          className="w-full text-xs border border-primary/40 rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          aria-label="Edit proposal summary"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleSaveTermsEdit(item.id)}
                            disabled={actingOn === item.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 transition-all disabled:opacity-50"
                          >
                            {actingOn === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded text-xs text-muted-foreground border border-border/40 hover:border-border transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                    )}
                    {item.adminNotes && (
                      <p className="text-xs text-blue-400/80 italic">Admin notes: {item.adminNotes}</p>
                    )}
                    {item.status === "pending" && editingId !== item.id && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Admin notes (optional)"
                          value={queueNotes[item.id] ?? ""}
                          onChange={e => setQueueNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full text-xs border border-border/40 rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingId(item.id); setEditSummary(item.summary); }}
                            className="px-3 py-1.5 rounded text-xs font-semibold border border-border/40 text-muted-foreground hover:border-border hover:text-foreground transition-all"
                            aria-label="Edit proposal terms"
                          >
                            Edit Terms
                          </button>
                          <button
                            onClick={() => void handleQueueAction(item.id, "approve")}
                            disabled={actingOn === item.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-green-800/40 hover:bg-green-800/60 text-green-300 border border-green-700/40 transition-all disabled:opacity-50"
                          >
                            {actingOn === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
                            Approve
                          </button>
                          <button
                            onClick={() => void handleQueueAction(item.id, "reject")}
                            disabled={actingOn === item.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/40 transition-all disabled:opacity-50"
                          >
                            {actingOn === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XSquare className="w-3 h-3" />}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Proposal Management
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProposalForm(!showProposalForm)}
                className="gap-1.5"
              >
                {showProposalForm ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Plus className="w-3.5 h-3.5" /> Add Proposal</>}
              </Button>
            </div>
            <div className="space-y-1.5 mb-4">
              {proposalsData?.data?.map(p => (
                <div key={p.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg text-xs">
                  <span className="font-medium truncate flex-1">{p.name}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{p.submittedBy}</Badge>
                  {p.scores && <Badge variant="success" className="text-[9px] shrink-0">evaluated</Badge>}
                </div>
              ))}
              {!proposalsData?.data?.length && <p className="text-sm text-muted-foreground">No proposals loaded.</p>}
            </div>
            {showProposalForm && (
              <div className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary/5">
                <p className="text-sm font-semibold text-primary">New Proposal</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Name *</label>
                    <Input value={proposalFormData.name} onChange={e => setProposalFormData({ ...proposalFormData, name: e.target.value })} placeholder="e.g. EU Compromise Framework 2025" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Source</label>
                    <Input value={proposalFormData.source} onChange={e => setProposalFormData({ ...proposalFormData, source: e.target.value })} placeholder="e.g. European Union / Borrell 2025" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Summary *</label>
                    <textarea
                      className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px] resize-none"
                      value={proposalFormData.summary}
                      onChange={e => setProposalFormData({ ...proposalFormData, summary: e.target.value })}
                      placeholder="Brief description of the proposal's overall approach and goals"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Nuclear Protocol</label>
                    <textarea className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] resize-none" value={proposalFormData.nuclearProtocol} onChange={e => setProposalFormData({ ...proposalFormData, nuclearProtocol: e.target.value })} placeholder="Enrichment limits, centrifuge constraints..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Sanctions Relief</label>
                    <textarea className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] resize-none" value={proposalFormData.sanctionsRelief} onChange={e => setProposalFormData({ ...proposalFormData, sanctionsRelief: e.target.value })} placeholder="Primary, secondary sanctions timeline..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Hormuz Arrangements</label>
                    <textarea className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] resize-none" value={proposalFormData.hormuzArrangements} onChange={e => setProposalFormData({ ...proposalFormData, hormuzArrangements: e.target.value })} placeholder="Maritime security framework..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Verification Mechanism</label>
                    <textarea className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] resize-none" value={proposalFormData.verificationMechanism} onChange={e => setProposalFormData({ ...proposalFormData, verificationMechanism: e.target.value })} placeholder="IAEA protocols, snap inspections..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Sequencing</label>
                    <textarea className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] resize-none" value={proposalFormData.sequencing} onChange={e => setProposalFormData({ ...proposalFormData, sequencing: e.target.value })} placeholder="Step-by-step implementation order..." />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-xs font-medium text-muted-foreground">Timeline (years)</label>
                    <Input type="number" min={1} max={25} value={proposalFormData.timelineYears} onChange={e => setProposalFormData({ ...proposalFormData, timelineYears: parseInt(e.target.value) || 5 })} />
                  </div>
                </div>
                <Button onClick={handleAddProposal} disabled={submittingProposal} className="w-full gap-2">
                  {submittingProposal ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create &amp; Queue Evaluation</>}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">Evidence Sources</h3>
            <div className="space-y-3">
              {sources?.data?.map(src => (
                <div key={src.id} className="flex items-center justify-between p-3 bg-secondary/30 border border-border/50">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="font-medium flex items-center gap-2">
                      {src.name}
                      <Badge variant={src.isEnabled ? 'success' : 'outline'} className="text-[10px] px-1.5">{src.type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 truncate">{src.url}</div>
                  </div>
                  <button
                    onClick={() => toggleSource.mutate({ id: src.id, isEnabled: !src.isEnabled })}
                    disabled={toggleSource.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${src.isEnabled ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20' : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/50'}`}
                    title={src.isEnabled ? "Click to disable" : "Click to enable"}
                  >
                    {src.isEnabled
                      ? <><ToggleRight className="w-4 h-4" /> Active</>
                      : <><ToggleLeft className="w-4 h-4" /> Disabled</>
                    }
                  </button>
                </div>
              ))}
              {(!sources?.data || sources.data.length === 0) && <p className="text-sm text-muted-foreground">No sources configured.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="p-6 border-amber-700/30 bg-amber-950/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-amber-400" /> Deal Engine (Task B)
            </h3>
            {currentDeal ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Best Deal</p>
                  <p className="font-semibold capitalize">{currentDeal.architecture} architecture</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(currentDeal.createdAt).toLocaleString()}</p>
                </div>
                {currentDeal.scores && (() => {
                  const s = currentDeal.scores as DealScores;
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1">Score Summary</p>
                      {([
                        ["Composite", s.composite],
                        ["Feasibility", s.feasibility],
                        ["Domestic", s.domesticSellability],
                        ["Durability", s.durability],
                      ] as [string, number][]).map(([label, val]) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                          <div className="flex-1 bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${val >= 0.65 ? "bg-emerald-500" : val >= 0.45 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${(val ?? 0) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-mono font-bold w-10 text-right ${val >= 0.65 ? "text-emerald-400" : val >= 0.45 ? "text-amber-400" : "text-red-400"}`}>
                            {((val ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-emerald-700/40 text-emerald-400">
                    {currentDeal.isPareto ? "On Pareto Frontier" : "Not on Pareto"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p className="mb-3">No deal generated yet.</p>
                <p className="text-xs">Click "Run Deal Cycle" to start the multi-agent deal design pipeline.</p>
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={handleDealRun}
                disabled={dealRunTrigger.isPending}
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0"
              >
                {dealRunTrigger.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                ) : (
                  <><GitBranch className="w-4 h-4" /> Run Deal Cycle</>
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" /> Experiment Queue
              </h3>
              <div className="flex items-center gap-2">
                {dealCyclesData?.currentlyRunning && (
                  <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold bg-amber-950/30 border border-amber-700/30 px-2 py-1 rounded-full">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={() => void refetchDealCycles()} className="h-7 px-2 text-xs gap-1">
                  <Play className="w-3 h-3" /> Refresh
                </Button>
              </div>
            </div>
            {dealCyclesData?.data && dealCyclesData.data.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dealCyclesData.data.slice(0, 20).map((cycle) => {
                  const statusColor = cycle.status === "running"
                    ? "text-amber-400 bg-amber-950/30 border-amber-700/30"
                    : cycle.status === "error"
                    ? "text-red-400 bg-red-950/30 border-red-700/30"
                    : "text-emerald-400 bg-emerald-950/30 border-emerald-700/30";
                  const composite = cycle.bestComposite ?? 0;
                  return (
                    <div key={cycle.cycleId} className="flex items-center gap-3 text-xs py-2 border-b border-border/20 last:border-0">
                      <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{
                        background: composite >= 0.65 ? "#10b981" : composite >= 0.45 ? "#f59e0b" : "#ef4444"
                      }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium capitalize">{cycle.architectures.join(", ")}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${statusColor}`}>
                            {cycle.status}
                          </span>
                        </div>
                        <div className="text-muted-foreground font-mono text-[10px] mt-0.5">{cycle.cycleId.slice(0, 8)}… · {cycle.dealsCount} deal(s)</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-bold ${composite >= 0.65 ? "text-emerald-400" : composite >= 0.45 ? "text-amber-400" : "text-red-400"}`}>
                          {(composite * 100).toFixed(0)}%
                        </span>
                        <div className="text-[9px] text-muted-foreground">{new Date(cycle.startedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No deal cycles yet. Run a deal cycle to populate the experiment queue.
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{dealCyclesData?.data?.length ?? 0} cycle(s) total</span>
              <span className="text-xs text-muted-foreground">{dealCyclesData?.data?.reduce((s, c) => s + c.dealsCount, 0) ?? 0} deals generated</span>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-card border-primary/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="w-0.5 h-5 bg-primary rounded-full" />
              <DollarSign className="w-5 h-5 text-primary" /> Cost Summary
            </h3>
            {costSummary ? (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total API Spend</p>
                  <p className="text-4xl font-display font-bold text-red-400">{formatUsd(costSummary.totalCostUsd)}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">By Provider</p>
                  {Object.entries(costSummary.byProvider ?? {}).map(([prov, provData]) => (
                    <div key={prov} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{prov}</span>
                      <span className="font-mono">{formatUsd(provData.costUsd)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading costs...</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
