import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TESTS = [
  { file: "04-retry-backoff-validation.ts", label: "Retry & Backoff Validation", requiresApi: false },
  { file: "06-json-parsing-robustness.ts", label: "JSON Parsing Robustness", requiresApi: false },
  { file: "01-provider-connectivity.ts", label: "Provider Connectivity", requiresApi: true },
  { file: "02-timeout-maxtoken-experiments.ts", label: "Timeout & MaxTokens Experiments", requiresApi: true },
  { file: "03-prompt-size-stress.ts", label: "Prompt Size Stress", requiresApi: true },
  { file: "05-frontier-model-benchmarks.ts", label: "Frontier Model Benchmarks", requiresApi: true },
  { file: "07-pipeline-smoke-test.ts", label: "Pipeline Smoke Test", requiresApi: true },
  { file: "08-compound-failure-scenarios.ts", label: "Compound Failure Scenarios", requiresApi: true },
];

const args = process.argv.slice(2);
const offlineOnly = args.includes("--offline");
const testFilter = args.find(a => !a.startsWith("--"));

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       LLM Diagnostic Test Suite Runner              ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  if (offlineOnly) {
    console.log("Mode: OFFLINE (skipping tests that require API keys)\n");
  }

  const testsToRun = TESTS.filter(t => {
    if (offlineOnly && t.requiresApi) return false;
    if (testFilter && !t.file.includes(testFilter) && !t.label.toLowerCase().includes(testFilter.toLowerCase())) return false;
    return true;
  });

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const results: { label: string; status: string; durationMs: number }[] = [];

  for (const test of testsToRun) {
    const testPath = path.join(__dirname, test.file);
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Running: ${test.label} (${test.file})`);
    console.log("=".repeat(60));

    const start = Date.now();
    try {
      execSync(`npx tsx "${testPath}"`, {
        stdio: "inherit",
        timeout: 600_000,
        env: { ...process.env },
      });
      const duration = Date.now() - start;
      results.push({ label: test.label, status: "PASS", durationMs: duration });
      passed++;
    } catch (err: unknown) {
      const duration = Date.now() - start;
      results.push({ label: test.label, status: "FAIL", durationMs: duration });
      failed++;
    }
  }

  skipped = TESTS.length - testsToRun.length;

  console.log(`\n${"=".repeat(60)}`);
  console.log("FINAL RESULTS");
  console.log("=".repeat(60));
  for (const r of results) {
    console.log(`  [${r.status}] ${r.label} (${(r.durationMs / 1000).toFixed(1)}s)`);
  }
  if (skipped > 0) {
    console.log(`  [SKIP] ${skipped} test(s) skipped`);
  }
  console.log(`\n  Total: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Runner error:", err);
  process.exit(1);
});
