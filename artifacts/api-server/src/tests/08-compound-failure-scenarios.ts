import "dotenv/config";

const BRAINSTORM_PROMPT_LARGE = `You are a creative genius in conflict resolution.

CURRENT GEOPOLITICAL EVIDENCE (abbreviated):
Iran's nuclear enrichment has reached 60% purity. IAEA inspectors report limited access. US sanctions continue. Gulf states seek diplomatic normalization. Regional water crisis. Israel maintains opposition. EU mediators propose phased approach. China and Russia support Iran's position. IRGC consolidates domestic power. Hezbollah influences Lebanese politics. Saudi Arabia pursues Vision 2030 diversification. UAE seeks trade normalization. Turkey mediates. Iraq balances Iran-US relations. ASEAN model of cooperation discussed. Abraham Accords create new dynamics. JCPOA precedent examined.

ALL STAKEHOLDERS:
- iran [REQUIRED]: Seeks sanctions relief, nuclear sovereignty, regional influence.
- us [REQUIRED]: Seeks non-proliferation, regional stability, de-escalation.
- israel [CRITICAL]: Seeks security guarantees, enrichment limits.
- saudi_arabia [INFLUENTIAL]: Seeks regional balance, economic partnerships.
- uae [INFLUENTIAL]: Seeks trade normalization, stability.
- iaea [INFLUENTIAL]: Seeks verification access, compliance monitoring.
- eu [INFLUENTIAL]: Seeks diplomatic solution, trade normalization.
- china [INFLUENTIAL]: Seeks energy security, multipolar balance.
- russia [INFLUENTIAL]: Seeks strategic partnership with Iran, counter-US influence.
- irgc [CONTEXTUAL]: Seeks regime preservation, economic interests.
- hezbollah [CONTEXTUAL]: Seeks Lebanese autonomy, Iranian support.
- turkey [CONTEXTUAL]: Seeks regional mediation role, Kurdish stability.

BRAINSTORM INSTRUCTIONS: Return JSON with historicalAnalogies, creativeProvisions, crossIssueLinkages, unconventionalApproaches.
Generate at least 4 historical analogies, 5 creative provisions (2+ breakthrough), 4 linkages, 4 approaches.

Return JSON:
{
  "historicalAnalogies": [{ "dealName": "...", "relevantLesson": "...", "applicability": "..." }],
  "creativeProvisions": [{ "idea": "...", "rationale": "...", "noveltyLevel": "incremental|significant|breakthrough" }],
  "crossIssueLinkages": [{ "linkage": "...", "stakeholdersHelped": ["..."] }],
  "unconventionalApproaches": ["..."]
}`;

const SYSTEM_PROMPT = "You are a creative genius in conflict resolution. Output valid JSON only.";

type ScenarioResult = {
  scenario: string;
  primary: { ok: boolean; latencyMs: number; error?: string };
  mitigations: { strategy: string; ok: boolean; latencyMs: number; error?: string }[];
};

async function callWithTimeout(provider: string, model: string, prompt: string, systemPrompt: string, maxTokens: number, timeoutMs: number): Promise<{ ok: boolean; latencyMs: number; error?: string; contentLength?: number }> {
  const start = Date.now();
  try {
    if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model, max_tokens: maxTokens, system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }, { timeout: timeoutMs, maxRetries: 0 });
      const block = resp.content[0];
      const content = block?.type === "text" ? block.text : "";
      return { ok: !!content, latencyMs: Date.now() - start, contentLength: content.length };
    } else if (provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: timeoutMs });
      const resp = await client.chat.completions.create({
        model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        max_completion_tokens: maxTokens,
      });
      const content = resp.choices[0]?.message?.content ?? "";
      return { ok: !!content, latencyMs: Date.now() - start, contentLength: content.length };
    } else if (provider === "gemini") {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const resp = await client.models.generateContent({
        model, contents: prompt, config: { maxOutputTokens: maxTokens, systemInstruction: systemPrompt },
      });
      const content = resp.text ?? "";
      return { ok: !!content, latencyMs: Date.now() - start, contentLength: content.length };
    }
    return { ok: false, latencyMs: 0, error: "Unknown provider" };
  } catch (err: unknown) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function scenario1_BrainstormTimeout(): Promise<ScenarioResult> {
  console.log("\n--- Scenario 1: Brainstorm Timeout (mirrors production error) ---");
  console.log('  Error: "anthropic/claude-opus-4-6 timed out after 600s"\n');

  const primary = await callWithTimeout("anthropic", "claude-opus-4-6", BRAINSTORM_PROMPT_LARGE, SYSTEM_PROMPT, 16384, 120_000);
  console.log(`  Primary (Opus, 120s timeout, 16384 tokens): ${primary.ok ? "PASS" : "FAIL"} | ${primary.latencyMs}ms${primary.error ? ` | ${primary.error.slice(0, 60)}` : ""}`);

  const mitigations: ScenarioResult["mitigations"] = [];

  const m1 = await callWithTimeout("anthropic", "claude-opus-4-6", BRAINSTORM_PROMPT_LARGE, SYSTEM_PROMPT, 8192, 120_000);
  mitigations.push({ strategy: "Reduce maxTokens to 8192", ...m1 });
  console.log(`  Mitigation 1 (Opus, reduced tokens): ${m1.ok ? "PASS" : "FAIL"} | ${m1.latencyMs}ms`);

  const shorterPrompt = BRAINSTORM_PROMPT_LARGE.slice(0, Math.floor(BRAINSTORM_PROMPT_LARGE.length * 0.6));
  const m2 = await callWithTimeout("anthropic", "claude-opus-4-6", shorterPrompt, SYSTEM_PROMPT, 8192, 120_000);
  mitigations.push({ strategy: "Shorter prompt (60%)", ...m2 });
  console.log(`  Mitigation 2 (Opus, shorter prompt): ${m2.ok ? "PASS" : "FAIL"} | ${m2.latencyMs}ms`);

  const m3 = await callWithTimeout("openai", "gpt-5.2", BRAINSTORM_PROMPT_LARGE, SYSTEM_PROMPT, 16384, 120_000);
  mitigations.push({ strategy: "Fallback to GPT-5.2", ...m3 });
  console.log(`  Mitigation 3 (GPT-5.2 fallback): ${m3.ok ? "PASS" : "FAIL"} | ${m3.latencyMs}ms`);

  const m4 = await callWithTimeout("gemini", "gemini-3.1-pro-preview", BRAINSTORM_PROMPT_LARGE, SYSTEM_PROMPT, 16384, 120_000);
  mitigations.push({ strategy: "Fallback to Gemini 3.1", ...m4 });
  console.log(`  Mitigation 4 (Gemini fallback): ${m4.ok ? "PASS" : "FAIL"} | ${m4.latencyMs}ms`);

  return { scenario: "Brainstorm Timeout", primary, mitigations };
}

async function scenario2_JudgePanelPartialFailure(): Promise<ScenarioResult> {
  console.log("\n--- Scenario 2: Judge Panel Partial Failure ---");
  console.log("  Tests all 3 providers in parallel (as judge panel does)\n");

  const judgePrompt = `Score this deal on 7 dimensions (0.0-1.0): "Iran limits enrichment to 3.67%, US lifts energy sanctions over 2 years, IAEA gets full access, regional water cooperation fund established."
Return JSON: { "feasibility": 0.6, "feasibilityRationale": "...", "coherence": 0.7, "coherenceRationale": "...", "evidenceGrounding": 0.5, "evidenceGroundingRationale": "...", "domesticSellability": 0.4, "domesticSellabilityRationale": "...", "regionalStability": 0.6, "regionalStabilityRationale": "...", "implementability": 0.5, "implementabilityRationale": "...", "durability": 0.5, "durabilityRationale": "..." }`;
  const judgeSystem = "You are a judicial panel scoring peace deals. Output valid JSON only.";

  const providers = [
    { provider: "anthropic", model: "claude-opus-4-6" },
    { provider: "openai", model: "gpt-5.2" },
    { provider: "gemini", model: "gemini-3.1-pro-preview" },
  ];

  const results = await Promise.allSettled(
    providers.map(async ({ provider, model }) => {
      const r = await callWithTimeout(provider, model, judgePrompt, judgeSystem, 4096, 120_000);
      console.log(`  ${provider}/${model}: ${r.ok ? "PASS" : "FAIL"} | ${r.latencyMs}ms${r.error ? ` | ${r.error.slice(0, 60)}` : ""}`);
      return { provider, ...r };
    })
  );

  const successes = results.filter(r => r.status === "fulfilled" && r.value.ok).length;
  console.log(`  Panel result: ${successes}/3 judges responded successfully`);
  console.log(`  ${successes >= 1 ? "PASS — pipeline can proceed with partial panel" : "FAIL — all judges failed"}`);

  return {
    scenario: "Judge Panel Partial Failure",
    primary: { ok: successes >= 1, latencyMs: 0 },
    mitigations: [],
  };
}

async function scenario3_OptimizationChainFailure(): Promise<ScenarioResult> {
  console.log("\n--- Scenario 3: Deal Optimization Failure Chain ---");
  console.log('  Error: "Deal optimization failed: LLMCallError"\n');

  const optimPrompt = `Given stakeholder objections: Israel rejects enrichment above 3.67%, IRGC rejects full inspections, US demands irreversible dismantlement.
Propose 3 amendments that address objections while maintaining deal viability.
Return JSON: { "proposedAmendments": [{ "amendment": "...", "targetStakeholder": "...", "tradeoff": "..." }], "creativeTradeoffs": [{ "tradeoff": "...", "beneficiaries": ["..."] }] }`;
  const optimSystem = "You are a skilled mediator. Output valid JSON only.";

  const primary = await callWithTimeout("anthropic", "claude-opus-4-6", optimPrompt, optimSystem, 8192, 90_000);
  console.log(`  Primary (Opus, 90s): ${primary.ok ? "PASS" : "FAIL"} | ${primary.latencyMs}ms`);

  const mitigations: ScenarioResult["mitigations"] = [];

  const m1 = await callWithTimeout("openai", "gpt-5.2", optimPrompt, optimSystem, 8192, 90_000);
  mitigations.push({ strategy: "Fallback to GPT-5.2", ...m1 });
  console.log(`  Fallback (GPT-5.2): ${m1.ok ? "PASS" : "FAIL"} | ${m1.latencyMs}ms`);

  const m2 = await callWithTimeout("gemini", "gemini-3.1-pro-preview", optimPrompt, optimSystem, 8192, 90_000);
  mitigations.push({ strategy: "Fallback to Gemini 3.1", ...m2 });
  console.log(`  Fallback (Gemini): ${m2.ok ? "PASS" : "FAIL"} | ${m2.latencyMs}ms`);

  return { scenario: "Optimization Chain Failure", primary, mitigations };
}

async function main() {
  console.log("=== Compound Failure Scenario Tests ===");
  console.log("Simulating exact error patterns from production logs\n");

  const results: ScenarioResult[] = [];

  results.push(await scenario1_BrainstormTimeout());
  results.push(await scenario2_JudgePanelPartialFailure());
  results.push(await scenario3_OptimizationChainFailure());

  console.log("\n=== Overall Summary ===\n");
  for (const r of results) {
    const primaryStatus = r.primary.ok ? "PRIMARY OK" : "PRIMARY FAILED";
    const mitigationOk = r.mitigations.some(m => m.ok);
    const fallbackStatus = r.mitigations.length > 0
      ? (mitigationOk ? "FALLBACK AVAILABLE" : "ALL FALLBACKS FAILED")
      : "N/A";
    console.log(`  ${r.scenario}: ${primaryStatus} | ${fallbackStatus}`);

    if (!r.primary.ok && mitigationOk) {
      const bestMitigation = r.mitigations.filter(m => m.ok).sort((a, b) => a.latencyMs - b.latencyMs)[0];
      console.log(`    Best mitigation: ${bestMitigation!.strategy} (${bestMitigation!.latencyMs}ms)`);
    }
  }

  console.log("\n=== Recommendations ===");
  console.log("1. Enable fallback models in admin config (generation → openai/gpt-5.2, adversarial → anthropic/claude-opus-4-6)");
  console.log("2. Reduce maxTokens from 16384 to 8192 for brainstorm stage if Opus consistently times out");
  console.log("3. Set timeouts to 180s instead of 600s — with fallbacks, shorter timeouts + fast failover is better than long waits");
  console.log("4. The compounding retry bug (SDK maxRetries=2 × wrapper retries=2) has been fixed to maxRetries=0 on SDK");
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
