import Parser from "rss-parser";
import { db } from "@workspace/db";
import { evidenceItemsTable, evidenceSourcesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";

const parser = new Parser({ timeout: 10000 });

const IRAN_KEYWORDS = [
  "iran", "tehran", "nuclear", "iaea", "sanctions", "rouhani", "khamenei",
  "irgc", "hezbollah", "hamas", "houthi", "israel", "mossad", "idf",
  "strait of hormuz", "persian gulf", "zarif", "enrichment", "centrifuge",
  "us-iran", "jcpoa", "ceasefire", "deescalation", "middle east conflict"
];

function isIranRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return IRAN_KEYWORDS.some(kw => lower.includes(kw));
}

function classifyEvidenceType(title: string, text: string): string {
  const combined = (title + " " + text).toLowerCase();
  if (/military|strike|attack|troops|missile|drone|war|conflict|bomb/.test(combined)) return "military";
  if (/diplomacy|talks|negotiation|deal|agreement|meeting|summit|envoy/.test(combined)) return "diplomatic";
  if (/sanctions|oil|economy|trade|export|gdp|financial|bank/.test(combined)) return "economic";
  if (/civilian|humanitarian|refugee|hospital|food|water|aid/.test(combined)) return "humanitarian";
  return "political";
}

export async function ingestRSSFeeds(): Promise<number> {
  let ingested = 0;
  const sources = await db.select().from(evidenceSourcesTable)
    .where(and(eq(evidenceSourcesTable.type, "rss"), eq(evidenceSourcesTable.isEnabled, true)));

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of (feed.items ?? []).slice(0, 20)) {
        const title = item.title ?? "";
        const content = item.contentSnippet ?? item.content ?? item.summary ?? "";
        const link = item.link ?? "";

        if (!isIranRelevant(title + " " + content)) continue;

        const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
        const id = randomUUID();
        const evidenceType = classifyEvidenceType(title, content);

        try {
          await db.insert(evidenceItemsTable).values({
            id,
            source: source.id,
            sourceUrl: link,
            publishedAt,
            title,
            text: content.slice(0, 2000),
            evidenceType,
            stakeholderRelevance: [],
            isProcessed: false,
          }).onConflictDoNothing();
          ingested++;
        } catch (_insertErr) {
          // Skip duplicates
        }
      }

      await db.update(evidenceSourcesTable)
        .set({ lastFetchedAt: new Date() })
        .where(eq(evidenceSourcesTable.id, source.id));
    } catch (err) {
      logger.warn({ sourceId: source.id, err }, "Failed to ingest RSS feed");
    }
  }

  return ingested;
}
