/**
 * Fetches real external business news from public RSS feeds.
 * Cached for 15 minutes to avoid hammering sources.
 */

export interface ExternalNewsItem {
  id: number;
  severity: "info";
  type: "external";
  title: string;
  body: string;
  businessId: null;
  businessName: null;
  sourceLabel: string;
  authorName: string | null;
  isUrgentFlag: false;
  actionable: false;
  status: "new";
  snoozedUntil: null;
  createdAt: string;
  taskId: null;
  recipientRole: null;
  url: string | null;
}

interface RssEntry {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  author?: string;
}

interface FeedConfig {
  url: string;
  sourceLabel: string;
}

const FEEDS: FeedConfig[] = [
  {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    sourceLabel: "BBC Business",
  },
  {
    url: "https://feeds.reuters.com/reuters/businessNews",
    sourceLabel: "Reuters",
  },
  {
    url: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
    sourceLabel: "CNBC",
  },
  {
    url: "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
    sourceLabel: "РБК",
  },
];

// In-memory cache
let cacheData: ExternalNewsItem[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i");
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();

  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(re);
  if (!match) return "";
  return match[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLink(itemXml: string): string {
  // Try <link> not inside CDATA (plain text node between tags)
  const linkRe = /<link>([^<]+)<\/link>/i;
  const m = itemXml.match(linkRe);
  if (m) return m[1].trim();

  // Try atom:link href
  const atomRe = /<(?:atom:)?link[^>]+href="([^"]+)"/i;
  const am = itemXml.match(atomRe);
  if (am) return am[1].trim();

  return "";
}

function parseItems(xml: string): RssEntry[] {
  const items: RssEntry[] = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");
    const link = extractLink(block);
    const author = extractTag(block, "author") ||
      extractTag(block, "dc:creator") || "";

    if (title) {
      items.push({ title, description, pubDate, link, author: author || undefined });
    }
  }
  return items;
}

async function fetchFeed(config: FeedConfig): Promise<ExternalNewsItem[]> {
  try {
    const response = await fetch(config.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BusinessJarvis/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const entries = parseItems(xml);

    return entries.slice(0, 8).map((entry, idx) => {
      const pubDate = entry.pubDate ? new Date(entry.pubDate) : new Date();
      const id = -(Date.now() % 1_000_000 + idx * 1000 + config.url.length);

      // Compose body: description + source link
      let body = entry.description?.slice(0, 400) || entry.title;
      if (entry.link) {
        body += `\n\n🔗 ${entry.link}`;
      }

      return {
        id,
        severity: "info" as const,
        type: "external" as const,
        title: entry.title,
        body,
        businessId: null,
        businessName: null,
        sourceLabel: config.sourceLabel,
        authorName: entry.author || null,
        isUrgentFlag: false as const,
        actionable: false as const,
        status: "new" as const,
        snoozedUntil: null,
        createdAt: isNaN(pubDate.getTime()) ? new Date().toISOString() : pubDate.toISOString(),
        taskId: null,
        recipientRole: null,
        url: entry.link || null,
      };
    });
  } catch {
    return [];
  }
}

export async function getExternalNews(): Promise<ExternalNewsItem[]> {
  if (cacheData && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cacheData;
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all: ExternalNewsItem[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Sort by date descending
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  cacheData = all;
  cacheTime = Date.now();
  return all;
}

export function invalidateExternalNewsCache(): void {
  cacheData = null;
  cacheTime = 0;
}
