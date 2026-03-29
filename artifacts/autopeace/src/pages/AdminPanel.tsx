import React, { useState } from "react";
import { 
  useGetAdminConfig, 
  useUpdateAdminConfig, 
  useTriggerRun,
  useListEvidenceSources,
  useGetAdminCostsSummary,
  type AdminConfigResponse,
  type AdminConfigUpdate,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminKey } from "@/hooks/use-admin";
import { PageHeader, Card, Button, Input, Badge } from "@/components/ui";
import { Lock, Play, Save, LogOut, Loader2, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";
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

  const [formData, setFormData] = useState<AdminConfigUpdate>({});

  React.useEffect(() => {
    if (config) {
      const update: AdminConfigUpdate = {
        cadence: config.cadence,
        budgetCapUsd: config.budgetCapUsd,
        isPaused: config.isPaused,
        anthropicModel: config.anthropicModel,
        openaiModel: config.openaiModel,
        geminiModel: config.geminiModel,
      };
      setFormData(update);
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

  const isUnauthorized = !!adminKey && isConfigError;

  if (!adminKey || isUnauthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <Card className="w-full max-w-md p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive via-orange-500 to-primary" />
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 border border-border">
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
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleRun} disabled={runTrigger.isPending} className="gap-2">
            {runTrigger.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Force Run Cycle
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
                  className="w-full h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary/50 bg-background"
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
            <h3 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">Evidence Sources</h3>
            <div className="space-y-3">
              {sources?.data?.map(src => (
                <div key={src.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${src.isEnabled ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
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
          <Card className="p-6 bg-gradient-to-br from-card to-card border-primary/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
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
