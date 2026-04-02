import "dotenv/config";

function parseLLMJsonDealEngine<T>(text: string, label: string): T {
  const strategies = [
    () => {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (!match) return null;
      return match[1];
    },
    () => {
      const match = text.match(/(\{[\s\S]*\})/);
      if (!match) return null;
      return match[1];
    },
    () => {
      const match = text.match(/(\[[\s\S]*\])/);
      if (!match) return null;
      return match[1];
    },
    () => text,
  ];

  for (const strategy of strategies) {
    try {
      let raw = strategy();
      if (!raw) continue;
      raw = raw.replace(/,\s*([}\]])/g, "$1");
      raw = raw.replace(/[\x00-\x1f\x7f]/g, (c) => c === "\n" || c === "\r" || c === "\t" ? c : "");
      const parsed = JSON.parse(raw) as T;
      if (parsed !== null && parsed !== undefined) return parsed;
    } catch {
      continue;
    }
  }

  throw new Error(`parseLLMJson FAILED for ${label}`);
}

function parseLLMJsonScoring(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    ?? text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch?.[1]) throw new Error(`No JSON found in: ${text.slice(0, 200)}`);
  let raw = jsonMatch[1].trim();
  raw = raw.replace(/,\s*([}\]])/g, "$1");
  raw = raw.replace(/[\x00-\x1f\x7f]/g, (c) => c === "\n" || c === "\r" || c === "\t" ? c : "");
  return JSON.parse(raw);
}

type TestCase = { label: string; input: string; shouldPass: boolean; expectedType?: "object" | "array"; scoringShouldPass?: boolean };

const testCases: TestCase[] = [
  {
    label: "Clean JSON object",
    input: '{"status": "ok", "count": 5}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON in markdown code block",
    input: '```json\n{"status": "ok", "count": 5}\n```',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON in code block without language tag",
    input: '```\n{"status": "ok"}\n```',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON with trailing comma in object",
    input: '{"status": "ok", "count": 5,}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON with trailing comma in array",
    input: '{"items": ["a", "b", "c",]}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON with nested trailing commas",
    input: '{"outer": {"inner": [1, 2, 3,],},}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON wrapped in text",
    input: 'Here is my analysis:\n\n{"status": "ok"}\n\nHope this helps!',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON array (red team results)",
    input: '[{"flaw": "enforcement gap"}, {"flaw": "spoiler scenario"}]',
    shouldPass: true,
    expectedType: "array",
  },
  {
    label: "JSON array in code block",
    input: '```json\n[{"flaw": "enforcement gap"}]\n```',
    shouldPass: true,
    expectedType: "array",
  },
  {
    label: "Deeply nested JSON",
    input: '{"level1": {"level2": {"level3": {"value": 42}}}}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON with control characters (should strip)",
    input: '{"status": "ok\x01\x02", "value": 5}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "JSON with newlines in values (should preserve)",
    input: '{"rationale": "Line 1\\nLine 2\\nLine 3"}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "Truncated JSON (token limit hit mid-object)",
    input: '{"historicalAnalogies": [{"dealName": "Camp David", "relevantLesson": "Step-by-step framework worked because',
    shouldPass: false,
  },
  {
    label: "Truncated JSON in code block",
    input: '```json\n{"status": "ok", "data": [1, 2, 3, 4,\n```',
    shouldPass: false,
  },
  {
    label: "Empty string",
    input: "",
    shouldPass: false,
  },
  {
    label: "No JSON at all",
    input: "I cannot provide that information due to safety guidelines.",
    shouldPass: false,
  },
  {
    label: "Multiple JSON objects (greedy regex captures both — known limitation)",
    input: '{"first": true}\n{"second": true}',
    shouldPass: false,
  },
  {
    label: "JSON with unicode",
    input: '{"country": "ایران", "city": "تهران"}',
    shouldPass: true,
    expectedType: "object",
  },
  {
    label: "Real brainstorm output format",
    input: `Here are my brainstorm results:

\`\`\`json
{
  "historicalAnalogies": [
    { "dealName": "Camp David Accords", "relevantLesson": "Step-by-step framework", "applicability": "phased approach" }
  ],
  "creativeProvisions": [
    { "idea": "Joint water management", "rationale": "shared resource creates interdependence", "noveltyLevel": "breakthrough" }
  ],
  "crossIssueLinkages": [
    { "linkage": "water-for-transparency", "stakeholdersHelped": ["iran", "us", "iaea"] }
  ],
  "unconventionalApproaches": ["citizen diplomacy", "tech-driven verification"]
}
\`\`\``,
    shouldPass: true,
    expectedType: "object",
  },
];

async function main() {
  console.log("=== JSON Parsing Robustness Tests ===\n");

  let dealEnginePassed = 0;
  let dealEngineFailed = 0;
  let scoringPassed = 0;
  let scoringFailed = 0;

  console.log("--- deal-engine parseLLMJson (4-strategy parser) ---\n");
  for (const tc of testCases) {
    try {
      const result = parseLLMJsonDealEngine(tc.input, tc.label);
      if (tc.shouldPass) {
        const typeOk = !tc.expectedType || (tc.expectedType === "array" ? Array.isArray(result) : typeof result === "object" && !Array.isArray(result));
        if (typeOk) {
          console.log(`  [PASS] ${tc.label}`);
          dealEnginePassed++;
        } else {
          console.log(`  [FAIL] ${tc.label} — wrong type: expected ${tc.expectedType}, got ${Array.isArray(result) ? "array" : typeof result}`);
          dealEngineFailed++;
        }
      } else {
        console.log(`  [FAIL] ${tc.label} — should have thrown but parsed successfully`);
        dealEngineFailed++;
      }
    } catch {
      if (!tc.shouldPass) {
        console.log(`  [PASS] ${tc.label} — correctly rejected`);
        dealEnginePassed++;
      } else {
        console.log(`  [FAIL] ${tc.label} — should have parsed but threw`);
        dealEngineFailed++;
      }
    }
  }

  console.log(`\n  deal-engine parser: ${dealEnginePassed}/${dealEnginePassed + dealEngineFailed} passed\n`);

  console.log("--- scoring.ts parseLLMJson (2-strategy parser) ---\n");
  for (const tc of testCases.filter(tc => tc.expectedType !== "array")) {
    const expectPass = tc.scoringShouldPass !== undefined ? tc.scoringShouldPass : tc.shouldPass;
    try {
      const result = parseLLMJsonScoring(tc.input);
      if (expectPass) {
        console.log(`  [PASS] ${tc.label}`);
        scoringPassed++;
      } else {
        console.log(`  [FAIL] ${tc.label} — should have thrown but parsed`);
        scoringFailed++;
      }
    } catch {
      if (!expectPass) {
        console.log(`  [PASS] ${tc.label} — correctly rejected (known limitation)`);
        scoringPassed++;
      } else {
        console.log(`  [FAIL] ${tc.label} — should have parsed but threw`);
        scoringFailed++;
      }
    }
  }

  console.log(`\n  scoring parser: ${scoringPassed}/${scoringPassed + scoringFailed} passed\n`);

  const allPassed = dealEngineFailed === 0 && scoringFailed === 0;
  console.log("=== Summary ===");
  console.log(allPassed ? "All JSON parsing tests passed." : "Some tests FAILED — review parser edge cases.");
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
