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

export function parseLLMJson(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) 
    ?? text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch?.[1]) throw new Error(`No JSON found in: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[1].trim());
}
