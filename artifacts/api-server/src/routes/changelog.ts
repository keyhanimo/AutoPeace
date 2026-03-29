import { Router } from "express";
import { db } from "@workspace/db";
import { changelogEntriesTable } from "@workspace/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { GetChangelogEntryResponse, ListChangelogResponse } from "@workspace/api-zod";
import { sendValidated } from "../lib/validate-response";

const router = Router();

router.get("/changelog.xml", async (_req, res) => {
  try {
    const entries = await db.select().from(changelogEntriesTable)
      .orderBy(desc(changelogEntriesTable.timestamp))
      .limit(50);

    const domain = process.env["REPLIT_DEV_DOMAIN"] ?? "autopeace.app";
    const baseUrl = `https://${domain}`;

    const items = entries.map(e => {
      const title = (e.headline ?? "AutoPeace Update").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const summary = (e.notes ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const pubDate = new Date(e.timestamp).toUTCString();
      return `    <item>
      <title>${title}</title>
      <link>${baseUrl}/changelog/${e.id}</link>
      <description>${summary}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${e.id}</guid>
    </item>`;
    });

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AutoPeace — Iran Conflict Research Updates</title>
    <link>${baseUrl}/changelog</link>
    <description>AI-powered peace research updates: forecasts, deals, and conflict analysis for the Iran conflict complex.</description>
    <language>en</language>
    <atom:link href="${baseUrl}/api/changelog.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>`;

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(rss);
  } catch (err) {
    res.status(500).send("<?xml version='1.0'?><error>Internal error</error>");
  }
});

router.get("/changelog", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"]) || 20, 100);
    const offset = Number(req.query["offset"]) || 0;

    const [data, totalResult] = await Promise.all([
      db.select().from(changelogEntriesTable)
        .orderBy(desc(changelogEntriesTable.timestamp))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(changelogEntriesTable),
    ]);

    sendValidated(res, ListChangelogResponse, { data, total: totalResult[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/changelog/:id", async (req, res) => {
  try {
    const [entry] = await db.select().from(changelogEntriesTable)
      .where(eq(changelogEntriesTable.id, req.params["id"]!));
    if (!entry) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    sendValidated(res, GetChangelogEntryResponse, entry);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
