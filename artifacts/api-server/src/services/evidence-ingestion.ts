import Parser from "rss-parser";
import { db } from "@workspace/db";
import { evidenceItemsTable, evidenceSourcesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "node:crypto";
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

function stableEvidenceId(source: string, sourceUrl: string, publishedAt: Date): string {
  const key = `${source}::${sourceUrl}::${publishedAt.toISOString().slice(0, 19)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
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
        const id = stableEvidenceId(source.id, link, publishedAt);
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
          logger.debug({ id }, "Evidence item already exists (dedup)");
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

export async function ingestGdeltEvents(): Promise<number> {
  const gdeltSource = await db.select().from(evidenceSourcesTable)
    .where(and(eq(evidenceSourcesTable.id, "gdelt"), eq(evidenceSourcesTable.isEnabled, true)))
    .limit(1);

  if (gdeltSource.length === 0) {
    logger.info("GDELT source disabled or not found, skipping");
    return 0;
  }

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=Iran+conflict+nuclear&mode=artlist&maxrecords=25&timespan=1d&format=json&startdatetime=${dateStr}000000&enddatetime=${dateStr}235959`;

  let ingested = 0;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, "GDELT API returned non-200");
      return 0;
    }

    const json = await resp.json() as { articles?: Array<{ title?: string; url?: string; seendate?: string; domain?: string }> };
    const articles = json.articles ?? [];

    for (const article of articles) {
      const title = article.title ?? "";
      const link = article.url ?? "";
      if (!title || !isIranRelevant(title)) continue;

      const publishedAt = article.seendate ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")) : new Date();
      const id = stableEvidenceId("gdelt", link, publishedAt);

      try {
        await db.insert(evidenceItemsTable).values({
          id,
          source: "gdelt",
          sourceUrl: link,
          publishedAt,
          title,
          text: title,
          evidenceType: classifyEvidenceType(title, ""),
          stakeholderRelevance: [],
          isProcessed: false,
        }).onConflictDoNothing();
        ingested++;
      } catch (_err) {
        logger.debug({ id }, "GDELT item already exists (dedup)");
      }
    }

    await db.update(evidenceSourcesTable)
      .set({ lastFetchedAt: new Date() })
      .where(eq(evidenceSourcesTable.id, "gdelt"));

    logger.info({ ingested }, "GDELT ingestion complete");
  } catch (err) {
    logger.warn({ err }, "GDELT ingestion failed");
  }

  return ingested;
}

export async function ingestAcledEvents(): Promise<number> {
  const acledSource = await db.select().from(evidenceSourcesTable)
    .where(and(eq(evidenceSourcesTable.id, "acled"), eq(evidenceSourcesTable.isEnabled, true)))
    .limit(1);

  if (acledSource.length === 0) {
    logger.info("ACLED source disabled or not found, skipping");
    return 0;
  }

  const acledApiKey = process.env["ACLED_API_KEY"];
  const acledEmail = process.env["ACLED_EMAIL"];

  if (!acledApiKey || !acledEmail) {
    logger.info("ACLED credentials not configured, skipping ACLED ingestion");
    return 0;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = `https://api.acleddata.com/acled/read/?key=${acledApiKey}&email=${acledEmail}&country=Iran&event_date=${thirtyDaysAgo}&event_date_where=>&limit=50&fields=event_id_cnty|event_date|event_type|actor1|actor2|notes|source_scale|fatalities|latitude|longitude`;

  let ingested = 0;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, "ACLED API returned non-200");
      return 0;
    }

    const json = await resp.json() as { data?: Array<{ event_id_cnty?: string; event_date?: string; event_type?: string; notes?: string; actor1?: string; actor2?: string; fatalities?: string }> };
    const events = json.data ?? [];

    for (const event of events) {
      const title = `[ACLED] ${event.event_type ?? "Event"}: ${event.actor1 ?? ""} vs ${event.actor2 ?? ""}`;
      const text = event.notes ?? title;
      const sourceUrl = `https://acleddata.com/event/${event.event_id_cnty ?? ""}`;
      const publishedAt = event.event_date ? new Date(event.event_date) : new Date();
      const id = stableEvidenceId("acled", sourceUrl, publishedAt);

      try {
        await db.insert(evidenceItemsTable).values({
          id,
          source: "acled",
          sourceUrl,
          publishedAt,
          title,
          text: text.slice(0, 2000),
          evidenceType: classifyEvidenceType(title, text),
          stakeholderRelevance: [],
          isProcessed: false,
        }).onConflictDoNothing();
        ingested++;
      } catch (_err) {
        logger.debug({ id }, "ACLED item already exists (dedup)");
      }
    }

    await db.update(evidenceSourcesTable)
      .set({ lastFetchedAt: new Date() })
      .where(eq(evidenceSourcesTable.id, "acled"));

    logger.info({ ingested }, "ACLED ingestion complete");
  } catch (err) {
    logger.warn({ err }, "ACLED ingestion failed");
  }

  return ingested;
}

export async function ingestAllSources(): Promise<number> {
  const [rssCount, gdeltCount, acledCount] = await Promise.allSettled([
    ingestRSSFeeds(),
    ingestGdeltEvents(),
    ingestAcledEvents(),
  ]).then(results => results.map(r => r.status === "fulfilled" ? r.value : 0));

  return (rssCount ?? 0) + (gdeltCount ?? 0) + (acledCount ?? 0);
}
