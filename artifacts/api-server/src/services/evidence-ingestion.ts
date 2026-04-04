import Parser from "rss-parser";
import { db } from "@workspace/db";
import { evidenceItemsTable, evidenceSourcesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "node:crypto";
import { logger } from "../lib/logger";

const parser = new Parser({ timeout: 10000 });

const IRAN_PRIMARY_KEYWORDS = [
  "iran", "tehran", "irgc", "persian gulf", "zarif", "khamenei", "rouhani",
  "pezeshkian", "araghchi", "raisi", "soleimani",
  "us-iran", "jcpoa", "strait of hormuz", "hormuz",
  "iran war", "iran conflict", "iran negotiation", "iran diplomacy",
  "iran deal", "iran agreement", "iran framework",
  "iran oil", "oil sanctions",
  "iran peace", "iran nuclear",
];

const IRAN_SECONDARY_KEYWORDS = [
  "nuclear", "iaea", "sanctions", "enrichment", "centrifuge",
  "hezbollah", "hamas", "houthi", "israel", "mossad", "idf",
  "ceasefire", "deescalation", "middle east conflict",
  "peace plan", "peace proposal", "peace deal", "peace framework",
  "diplomatic framework", "grand bargain", "nuclear deal",
  "nonaggression pact", "non-aggression",
  "nonproliferation", "non-proliferation",
  "middle east war", "middle east peace",
  "uranium", "plutonium", "nuclear weapon",
];

function isIranRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  if (IRAN_PRIMARY_KEYWORDS.some(kw => lower.includes(kw))) return true;
  const secondaryHits = IRAN_SECONDARY_KEYWORDS.filter(kw => lower.includes(kw));
  return secondaryHits.length >= 2;
}

function classifyEvidenceType(title: string, text: string): string {
  const combined = (title + " " + text).toLowerCase();
  if (/military|strike|attack|troops|missile|drone|war|conflict|bomb/.test(combined)) return "military";
  if (/diplomacy|talks|negotiation|deal|agreement|meeting|summit|envoy|proposal|framework|peace plan|ceasefire/.test(combined)) return "diplomatic";
  if (/sanctions|oil|economy|trade|export|gdp|financial|bank/.test(combined)) return "economic";
  if (/civilian|humanitarian|refugee|hospital|food|water|aid/.test(combined)) return "humanitarian";
  return "political";
}

function stableEvidenceId(source: string, sourceUrl: string, publishedAt: Date): string {
  const key = `${source}::${sourceUrl}::${publishedAt.toISOString().slice(0, 19)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const hostname = parsed.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return false;
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (hostname === "169.254.169.254" || hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
    if (hostname.includes("[") || hostname.startsWith("::")) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchArticleFullText(url: string): Promise<string | null> {
  if (!url || url.length < 10) return null;
  if (!isSafeUrl(url)) {
    logger.debug({ url }, "Skipping unsafe URL for full-text fetch");
    return null;
  }

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AutoPeace/1.0; +https://autopeace.ai)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get("location");
      if (!location || !isSafeUrl(new URL(location, url).href)) return null;
      const redirectResp = await fetch(new URL(location, url).href, {
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AutoPeace/1.0; +https://autopeace.ai)",
          "Accept": "text/html,application/xhtml+xml",
        },
        redirect: "manual",
      });
      if (!redirectResp.ok) return null;
      const ct = redirectResp.headers.get("content-type") ?? "";
      if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
      const html = await redirectResp.text();
      return extractTextFromHtml(html);
    }

    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) return null;

    const html = await resp.text();
    return extractTextFromHtml(html);
  } catch (err) {
    logger.debug({ url, err }, "Failed to fetch article full text");
    return null;
  }
}

function extractTextFromHtml(html: string): string | null {
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentDiv = html.match(/<div[^>]*class="[^"]*(?:article|content|post|entry|story)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  const bestBlock = articleMatch?.[1] ?? mainMatch?.[1] ?? contentDiv?.[1] ?? null;
  if (!bestBlock) return null;

  const text = stripHtmlTags(bestBlock);
  if (text.length < 100) return null;

  return text.slice(0, 10000);
}

function isSourceDueForFetch(source: { lastFetchedAt: Date | null; fetchFrequencyMinutes: number }): boolean {
  if (!source.lastFetchedAt) return true;
  const elapsedMs = Date.now() - source.lastFetchedAt.getTime();
  return elapsedMs >= source.fetchFrequencyMinutes * 60 * 1000;
}

export async function ingestRSSFeeds(): Promise<number> {
  let ingested = 0;
  const sources = await db.select().from(evidenceSourcesTable)
    .where(and(eq(evidenceSourcesTable.type, "rss"), eq(evidenceSourcesTable.isEnabled, true)));

  const MAX_FULLTEXT_FETCHES_PER_SOURCE = 5;

  for (const source of sources) {
    if (!isSourceDueForFetch(source)) continue;
    try {
      const feed = await parser.parseURL(source.url);
      let fullTextFetches = 0;
      for (const item of (feed.items ?? []).slice(0, 20)) {
        const title = item.title ?? "";
        const content = item.contentSnippet ?? item.content ?? item.summary ?? "";
        const link = item.link ?? "";

        if (!isIranRelevant(title + " " + content)) continue;

        const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
        const id = stableEvidenceId(source.id, link, publishedAt);

        let fullText = content;
        if (link && fullTextFetches < MAX_FULLTEXT_FETCHES_PER_SOURCE) {
          fullTextFetches++;
          const fetched = await fetchArticleFullText(link);
          if (fetched && fetched.length > content.length) {
            fullText = fetched;
          }
        }

        const evidenceType = classifyEvidenceType(title, fullText);

        try {
          await db.insert(evidenceItemsTable).values({
            id,
            source: source.id,
            sourceUrl: link,
            publishedAt,
            title,
            text: fullText.slice(0, 10000),
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

  if (!isSourceDueForFetch(gdeltSource[0]!)) return 0;

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const queries = [
    `Iran+conflict+nuclear`,
    `Iran+peace+proposal+deal`,
    `Iran+diplomatic+framework+negotiation`,
  ];

  let ingested = 0;
  for (const query of queries) {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=25&timespan=1d&format=json&startdatetime=${dateStr}000000&enddatetime=${dateStr}235959`;

    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) {
        logger.warn({ status: resp.status, query }, "GDELT API returned non-200");
        continue;
      }

      const json = await resp.json() as { articles?: Array<{ title?: string; url?: string; seendate?: string; domain?: string }> };
      const articles = json.articles ?? [];

      for (const article of articles) {
        const title = article.title ?? "";
        const link = article.url ?? "";
        if (!title || !isIranRelevant(title)) continue;

        const publishedAt = article.seendate ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")) : new Date();
        const id = stableEvidenceId("gdelt", link, publishedAt);

        let articleText = title;
        const fetched = await fetchArticleFullText(link);
        if (fetched) {
          articleText = fetched;
        }

        try {
          await db.insert(evidenceItemsTable).values({
            id,
            source: "gdelt",
            sourceUrl: link,
            publishedAt,
            title,
            text: articleText.slice(0, 10000),
            evidenceType: classifyEvidenceType(title, articleText),
            stakeholderRelevance: [],
            isProcessed: false,
          }).onConflictDoNothing();
          ingested++;
        } catch (_err) {
          logger.debug({ id }, "GDELT item already exists (dedup)");
        }
      }
    } catch (err) {
      logger.warn({ err, query }, "GDELT ingestion failed for query");
    }
  }

  await db.update(evidenceSourcesTable)
    .set({ lastFetchedAt: new Date() })
    .where(eq(evidenceSourcesTable.id, "gdelt"));

  logger.info({ ingested }, "GDELT ingestion complete");
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

  if (!isSourceDueForFetch(acledSource[0]!)) return 0;

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
          text: text.slice(0, 10000),
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

const WEB_SEARCH_QUERIES = [
  "Iran peace proposal nuclear deal framework",
  "Iran diplomatic initiative ceasefire agreement",
  "Iran nuclear negotiation new proposal",
  "JCPOA revival deal framework proposal",
];

export async function ingestWebSearchResults(): Promise<number> {
  const webSearchSources = await db.select().from(evidenceSourcesTable)
    .where(and(eq(evidenceSourcesTable.type, "web_search"), eq(evidenceSourcesTable.isEnabled, true)));

  if (webSearchSources.length === 0) {
    logger.info("No web_search sources enabled, skipping");
    return 0;
  }

  let ingested = 0;

  for (const source of webSearchSources) {
    if (!isSourceDueForFetch(source)) continue;
    const queries = source.url ? [source.url] : WEB_SEARCH_QUERIES;

    for (const query of queries) {
      try {
        const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const feed = await parser.parseURL(searchUrl);

        let fullTextFetches = 0;
        for (const item of (feed.items ?? []).slice(0, 10)) {
          const title = item.title ?? "";
          const content = item.contentSnippet ?? item.content ?? item.summary ?? "";
          const link = item.link ?? "";

          if (!isIranRelevant(title + " " + content)) continue;

          const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
          const id = stableEvidenceId(source.id, link, publishedAt);

          let fullText = content;
          if (link && fullTextFetches < 3) {
            fullTextFetches++;
            const fetched = await fetchArticleFullText(link);
            if (fetched && fetched.length > content.length) {
              fullText = fetched;
            }
          }

          const evidenceType = classifyEvidenceType(title, fullText);

          try {
            await db.insert(evidenceItemsTable).values({
              id,
              source: source.id,
              sourceUrl: link,
              publishedAt,
              title,
              text: fullText.slice(0, 10000),
              evidenceType,
              stakeholderRelevance: [],
              isProcessed: false,
            }).onConflictDoNothing();
            ingested++;
          } catch (_err) {
            logger.debug({ id }, "Web search item already exists (dedup)");
          }
        }
      } catch (err) {
        logger.warn({ query, err }, "Web search query failed");
      }
    }

    await db.update(evidenceSourcesTable)
      .set({ lastFetchedAt: new Date() })
      .where(eq(evidenceSourcesTable.id, source.id));
  }

  logger.info({ ingested }, "Web search ingestion complete");
  return ingested;
}

export async function ingestAllSources(): Promise<number> {
  const [rssCount, gdeltCount, acledCount, webSearchCount] = await Promise.allSettled([
    ingestRSSFeeds(),
    ingestGdeltEvents(),
    ingestAcledEvents(),
    ingestWebSearchResults(),
  ]).then(results => results.map(r => r.status === "fulfilled" ? r.value : 0));

  return (rssCount ?? 0) + (gdeltCount ?? 0) + (acledCount ?? 0) + (webSearchCount ?? 0);
}
