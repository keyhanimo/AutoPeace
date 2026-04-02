import { db } from "@workspace/db";
import { dealsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import pino from "pino";
import { dealToMarkdown } from "./deal-markdown";
import { callLLM, getModelConfig, resolveFallbackConfig } from "./llm-router";

const logger = pino({ name: "deal-narrative" });

const NARRATIVE_SYSTEM_PROMPT = `You are a senior diplomatic analyst writing a concise executive briefing about an AI-generated peace deal proposal for the Iran–US–Israel conflict complex.

Your output should be a clear, readable narrative summary — NOT a markdown document. Write in flowing prose with short paragraphs. Use no headings, no bullet points, no markdown formatting. Think of it as a well-written one-pager that a busy policy analyst could read in 2 minutes.

Structure your narrative as follows:
1. Open with the deal's core approach and architecture in one sentence.
2. Summarize the key terms (nuclear, sanctions, maritime, humanitarian) in 2-3 sentences.
3. Highlight the most notable innovative provisions in 1-2 sentences.
4. State the composite score and what it means (strong/moderate/weak).
5. Summarize stakeholder reception — who accepts, who rejects, and the main sticking points — in 2-3 sentences.
6. Close with the deal's main strengths and vulnerabilities in 1-2 sentences.

Keep the total output to approximately 200-250 words. Be specific — use actual numbers, stakeholder names, and provision details from the deal. Avoid vague generalities.`;

export async function generateDealNarrative(dealId: string): Promise<string> {
  const [deal] = await db.select()
    .from(dealsTable)
    .where(eq(dealsTable.id, dealId));

  if (!deal) {
    throw new Error(`Deal ${dealId} not found`);
  }

  const baseHost = process.env["PUBLIC_DOMAIN"] || process.env["REPLIT_DEV_DOMAIN"] || "autopeace.org";
  const permalinkUrl = `https://${baseHost}/deals/${deal.id}`;
  const markdown = dealToMarkdown(deal, permalinkUrl);

  const prompt = `Produce a concise narrative summary of this peace deal proposal. Remember: plain prose only, no markdown, no bullet points, no headings.\n\n${markdown}`;

  const config = await getModelConfig();
  const fallback = resolveFallbackConfig("generation", config);
  const result = await callLLM(
    prompt,
    NARRATIVE_SYSTEM_PROMPT,
    config.generationProvider,
    config.generationModel,
    { maxTokens: 1000, fallbackProvider: fallback?.provider, fallbackModel: fallback?.model },
  );

  const narrative = result.content.trim();

  await db.update(dealsTable)
    .set({ narrativeSummary: narrative })
    .where(eq(dealsTable.id, dealId));

  logger.info({ dealId, tokens: result.tokens }, "Deal narrative generated and stored");

  return narrative;
}
