import "dotenv/config";
import { callLLMForStage, getModelConfig, resolveStageConfig } from "../services/llm-router";

const STAGE_PROMPTS: { stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; name: string; role: "generation" | "evaluation" | "adversarial"; prompt: string; systemPrompt: string; maxTokens: number }[] = [
  {
    stage: 1, name: "Proposal Agent", role: "generation", maxTokens: 4096,
    systemPrompt: "You are an expert in peace deal design. Output valid JSON only.",
    prompt: `Draft a brief peace deal proposal for Iran nuclear negotiations with these terms:
Return JSON: { "nuclearProtocol": "brief description", "sanctionsRelief": "brief description", "verificationMechanism": "brief description", "timelineYears": 5 }`,
  },
  {
    stage: 2, name: "Stakeholder Evaluator", role: "evaluation", maxTokens: 4096,
    systemPrompt: "You are a geopolitical analyst evaluating a peace deal from multiple stakeholder perspectives. Output valid JSON only.",
    prompt: `Evaluate this deal: "Iran limits enrichment to 3.67%, US lifts energy sanctions over 2 years, IAEA gets full access."
Return JSON: { "iran": { "verdict": "accept|conditional|reject", "rationale": "why" }, "us": { "verdict": "accept|conditional|reject", "rationale": "why" }, "israel": { "verdict": "accept|conditional|reject", "rationale": "why" } }`,
  },
  {
    stage: 3, name: "Domestic Audiences", role: "evaluation", maxTokens: 2048,
    systemPrompt: "You analyze domestic political feasibility of peace deals. Output valid JSON only.",
    prompt: `For the deal "Iran limits enrichment, US lifts sanctions", assess domestic sellability.
Return JSON: { "iran": { "sellable": true, "narrative": "brief framing" }, "us": { "sellable": true, "narrative": "brief framing" } }`,
  },
  {
    stage: 4, name: "Red-Team Agent", role: "adversarial", maxTokens: 2048,
    systemPrompt: "You are an adversarial analyst. Output JSON.",
    prompt: `Stress-test this deal: "Iran limits enrichment to 3.67%, US lifts sanctions, IAEA monitors."
Return JSON array: [{ "flaw": "description", "severity": "critical|moderate|minor", "mitigatable": true }]`,
  },
  {
    stage: 5, name: "Negotiator Agent", role: "generation", maxTokens: 4096,
    systemPrompt: "You are a skilled mediator proposing deal amendments. Output valid JSON only.",
    prompt: `Israel rejected the deal because of enrichment concerns. Propose amendments.
Return JSON: { "proposedAmendments": [{ "amendment": "description", "targetStakeholder": "israel", "tradeoff": "what iran gets in return" }] }`,
  },
  {
    stage: 6, name: "Judge Agent", role: "evaluation", maxTokens: 2048,
    systemPrompt: "You are a judicial panel scoring a peace deal. Output valid JSON only.",
    prompt: `Score this deal on 7 dimensions (0.0-1.0): "Iran limits enrichment, US lifts sanctions, IAEA monitors."
Return JSON: { "feasibility": 0.6, "coherence": 0.7, "evidenceGrounding": 0.5, "domesticSellability": 0.4, "regionalStability": 0.6, "implementability": 0.5, "durability": 0.5 }`,
  },
  {
    stage: 7, name: "Meta-Evaluator", role: "evaluation", maxTokens: 2048,
    systemPrompt: "You evaluate pipeline quality. Output valid JSON only.",
    prompt: `The deal scored 55% composite. Brainstorm had 3 analogies, 4 provisions. 2/3 stakeholders accepted.
Return JSON: { "pipelineQuality": "adequate|good|excellent", "promptImprovements": [{ "stage": "brainstorm", "suggestion": "be more creative" }] }`,
  },
  {
    stage: 8, name: "Diagnosis Generator", role: "adversarial", maxTokens: 1024,
    systemPrompt: "You are a strategic conflict analyst. Provide a concise diagnosis paragraph. No JSON.",
    prompt: `The deal scored 55%. Israel rejected it. Iran accepted conditionally. US accepted. Main weakness: enrichment limits too weak for Israel. Provide a 2-sentence diagnosis for the next cycle.`,
  },
];

async function main() {
  console.log("=== Deal Pipeline Integration Smoke Test ===\n");

  const modelConfig = await getModelConfig();
  console.log("Loaded model config from DB (with admin overrides + fallback config)\n");

  for (const stage of STAGE_PROMPTS) {
    const resolved = resolveStageConfig(stage.stage, stage.role, modelConfig);
    console.log(`  Stage ${stage.stage} (${stage.name}): ${resolved.provider}/${resolved.model} [role: ${stage.role}]`);
  }
  console.log();

  let passed = 0;
  let failed = 0;
  const TIMEOUT = 120_000;

  for (const stage of STAGE_PROMPTS) {
    const resolved = resolveStageConfig(stage.stage, stage.role, modelConfig);
    process.stdout.write(`  Stage ${stage.stage} (${stage.name}) [${resolved.provider}/${resolved.model}]... `);

    const start = Date.now();
    try {
      const result = await callLLMForStage(
        stage.prompt,
        stage.systemPrompt,
        stage.stage,
        stage.role,
        modelConfig,
        { maxTokens: stage.maxTokens, timeoutMs: TIMEOUT },
      );
      const durationMs = Date.now() - start;
      console.log(`PASS | ${durationMs}ms | ${result.tokens} tok | ${result.content.length} chars`);
      passed++;
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAIL | ${durationMs}ms | ${msg.slice(0, 100)}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ${passed}/${passed + failed} stages passed`);
  if (failed > 0) {
    console.log(`  ${failed} stage(s) failed — review provider availability and timeouts`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
