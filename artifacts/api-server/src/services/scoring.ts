export interface ForecastProbabilities {
  continued_conflict: number;
  informal_deescalation: number;
  limited_ceasefire: number;
  humanitarian_mini_deal: number;
  sanctions_partial_deal: number;
  regional_framework: number;
  broad_settlement: number;
  major_escalation: number;
  [key: string]: number;
}

export function normalizeProbabilities(raw: Record<string, number>): ForecastProbabilities {
  const keys: (keyof ForecastProbabilities)[] = [
    "continued_conflict",
    "informal_deescalation",
    "limited_ceasefire",
    "humanitarian_mini_deal",
    "sanctions_partial_deal",
    "regional_framework",
    "broad_settlement",
    "major_escalation",
  ];

  const result: Partial<ForecastProbabilities> = {};
  let sum = 0;

  for (const key of keys) {
    const val = Math.max(0, Math.min(1, raw[key] ?? 0));
    result[key] = val;
    sum += val;
  }

  if (sum === 0) {
    result["continued_conflict"] = 1;
    return result as ForecastProbabilities;
  }

  for (const key of keys) {
    result[key] = (result[key] ?? 0) / sum;
  }

  return result as ForecastProbabilities;
}

const OUTCOME_KEYS: (keyof ForecastProbabilities)[] = [
  "continued_conflict",
  "informal_deescalation",
  "limited_ceasefire",
  "humanitarian_mini_deal",
  "sanctions_partial_deal",
  "regional_framework",
  "broad_settlement",
  "major_escalation",
];

export function computeBrierScore(
  probabilities: ForecastProbabilities,
  outcome: keyof ForecastProbabilities
): number {
  let sumSq = 0;
  for (const key of OUTCOME_KEYS) {
    const actual = key === outcome ? 1 : 0;
    const predicted = probabilities[key] ?? 0;
    sumSq += (predicted - actual) ** 2;
  }
  return sumSq / OUTCOME_KEYS.length;
}

export function computeLogScore(
  probabilities: ForecastProbabilities,
  outcome: keyof ForecastProbabilities
): number {
  const p = Math.max(1e-9, probabilities[outcome] ?? 0);
  return Math.log(p);
}

export interface CalibrationPoint {
  binMid: number;
  observedFreq: number;
  count: number;
}

export function computeCalibrationCurve(
  forecastOutcomePairs: Array<{ probability: number; correct: boolean }>,
  bins = 10
): CalibrationPoint[] {
  const binSize = 1 / bins;
  const buckets: Array<{ sum: number; correct: number }> = Array.from({ length: bins }, () => ({ sum: 0, correct: 0 }));

  for (const { probability, correct } of forecastOutcomePairs) {
    const binIdx = Math.min(Math.floor(probability / binSize), bins - 1);
    buckets[binIdx].sum++;
    if (correct) buckets[binIdx].correct++;
  }

  return buckets.map((b, i) => ({
    binMid: (i + 0.5) * binSize,
    observedFreq: b.sum === 0 ? 0 : b.correct / b.sum,
    count: b.sum,
  }));
}

export function parseLLMJson(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) 
    ?? text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch?.[1]) throw new Error(`No JSON found in: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[1].trim());
}
