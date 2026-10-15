import { cachedPlainText, sourceUrlForPath } from "../fetch/page.js";
import type { PlatformFilter, Store, Topic } from "../types.js";

export interface SearchHit {
  id: string;
  title: string;
  section: string | null;
  group: string | null;
  kind: Topic["kind"];
  sourceUrl: string;
  score: number;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "web",
  "app",
  "screen",
  "page",
  "view",
  "interface",
  "design",
  "user",
  "into",
  "from",
  "that",
  "this",
  "using",
  "use",
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function platformAllows(platforms: Topic["platforms"], filter: PlatformFilter): boolean {
  if (filter === "all" || platforms.length === 0) return true;
  return platforms.includes(filter);
}

function aliasIds(query: string, aliases: Record<string, string[]>): Set<string> {
  const ids = new Set<string>();
  const normalized = query.toLowerCase();
  for (const [key, targets] of Object.entries(aliases)) {
    if (matchesAlias(normalized, key)) {
      for (const id of targets) ids.add(id);
    }
  }
  return ids;
}

export function matchesAlias(query: string, alias: string): boolean {
  const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(" ");
  const phrase = words(alias);
  return phrase.length > 0 && ` ${words(query)} `.includes(` ${phrase} `);
}

export function searchTopics(
  query: string,
  store: Store,
  options: { platform?: PlatformFilter; section?: string; limit?: number; readCache?: boolean },
): SearchHit[] {
  const platform = options.platform ?? "all";
  const tokens = tokenize(query);
  const normalizedQuery = query.toLowerCase().trim();
  const aliases = aliasIds(query, store.aliases);
  const hits: SearchHit[] = [];

  for (const topic of store.topics) {
    if (options.section && topic.section !== options.section) continue;
    if (!platformAllows(topic.platforms, platform)) continue;

    const title = topic.title.toLowerCase();
    const id = topic.id;
    let score = 0;
    if (title === normalizedQuery || id === normalizedQuery.replace(/\s+/g, "-")) score += 100;
    else if (normalizedQuery.length > 2 && title.includes(normalizedQuery)) score += 40;
    for (const token of tokens) {
      if (title.includes(token)) score += 15;
      if (id.includes(token)) score += 10;
      if (topic.section?.includes(token)) score += 4;
      if (topic.group?.includes(token)) score += 4;
    }
    if (aliases.has(id)) score += 35;
    if (topic.kind === "collection") score -= 5;

    if (score <= 0 && options.readCache !== false && tokens.length > 0) {
      const cached = cachedPlainText(id);
      if (cached && tokens.every((token) => cached.toLowerCase().includes(token))) score += 8;
    }
    if (score <= 0) continue;

    hits.push({
      id,
      title: topic.title,
      section: topic.section,
      group: topic.group,
      kind: topic.kind,
      sourceUrl: sourceUrlForPath(topic.path),
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return hits.slice(0, options.limit ?? 8);
}
