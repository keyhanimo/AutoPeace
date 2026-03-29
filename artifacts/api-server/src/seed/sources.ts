import { db } from "@workspace/db";
import { evidenceSourcesTable } from "@workspace/db/schema";

const SOURCES = [
  {
    id: "rss_reuters",
    name: "Reuters Middle East",
    type: "rss",
    url: "https://feeds.reuters.com/reuters/worldNews",
    isEnabled: true,
    fetchFrequencyMinutes: 60,
  },
  {
    id: "rss_ap",
    name: "AP World News",
    type: "rss",
    url: "https://rsshub.app/apnews/topics/apf-intlnews",
    isEnabled: true,
    fetchFrequencyMinutes: 60,
  },
  {
    id: "rss_aljazeera",
    name: "Al Jazeera Middle East",
    type: "rss",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    isEnabled: true,
    fetchFrequencyMinutes: 60,
  },
  {
    id: "rss_bbc_world",
    name: "BBC World News",
    type: "rss",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    isEnabled: true,
    fetchFrequencyMinutes: 120,
  },
  {
    id: "rss_guardian",
    name: "The Guardian World",
    type: "rss",
    url: "https://www.theguardian.com/world/rss",
    isEnabled: true,
    fetchFrequencyMinutes: 120,
  },
];

export async function seedSources(): Promise<void> {
  for (const s of SOURCES) {
    await db.insert(evidenceSourcesTable).values(s).onConflictDoNothing();
  }
}
