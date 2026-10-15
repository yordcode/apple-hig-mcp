import { sourceUrlForPath } from "./fetch/page.js";
import { matchesAlias, searchTopics, tokenize } from "./search/search.js";
import type { DesignCard, PlatformFilter, RulePlatform, Store } from "./types.js";

export interface PresentedCard {
  id: string;
  title: string;
  kind: DesignCard["kind"];
  summary: string;
  sourceUrl: string;
  attribution: string;
  whenToUse: string[];
  whenNotToUse: string[];
  rules: string[];
  web?: DesignCard["web"];
  related: string[];
}

function ruleMatches(platforms: RulePlatform[], filter: PlatformFilter): boolean {
  if (filter === "all" || platforms.includes("all")) return true;
  return platforms.includes(filter);
}

export function presentCard(card: DesignCard, platform: PlatformFilter): PresentedCard {
  const presented: PresentedCard = {
    id: card.id,
    title: card.title,
    kind: card.kind,
    summary: card.summary,
    sourceUrl: sourceUrlForPath(card.sourcePath),
    attribution: "Apple created and publishes the Human Interface Guidelines. These are community implementation notes inspired by Apple's HIG, not official Apple guidance or a new design system.",
    whenToUse: card.whenToUse,
    whenNotToUse: card.whenNotToUse,
    rules: card.rules.filter((rule) => ruleMatches(rule.platforms, platform)).map((rule) => rule.statement),
    related: card.related,
  };
  if (platform === "web" || platform === "all") presented.web = card.web;
  return presented;
}

export function findCard(id: string, cards: DesignCard[]): DesignCard | undefined {
  const normalized = id.trim().toLowerCase().replace(/\s+/g, "-");
  return cards.find((card) => card.id === normalized || card.title.toLowerCase() === id.trim().toLowerCase());
}

function cardScore(card: DesignCard, query: string, tokens: string[], aliases: Record<string, string[]>): number {
  let score = 0;
  const title = card.title.toLowerCase();
  const normalized = query.toLowerCase();
  if (title === normalized || card.id === normalized.replace(/\s+/g, "-")) score += 80;
  for (const token of tokens) {
    if (card.id.includes(token) || title.includes(token)) score += 30;
    if (card.keywords.some((keyword) => keyword === token || keyword.includes(token))) score += 25;
    if (card.summary.toLowerCase().includes(token)) score += 6;
  }
  for (const [alias, ids] of Object.entries(aliases)) {
    if (matchesAlias(normalized, alias) && ids.includes(card.id)) score += 40;
  }
  return score;
}

export function guideInterface(task: string, platform: PlatformFilter, store: Store) {
  const tokens = tokenize(task);
  const ranked = store.cards
    .map((card) => ({ card, score: cardScore(card, task, tokens, store.aliases) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.card.title.localeCompare(b.card.title));

  const selected = ranked.slice(0, 3).map((entry) => entry.card);
  const references = selected.map((card) => presentCard(card, platform));
  const checklist = references.flatMap((card) => card.rules.map((rule) => `${card.title}: ${rule}`)).slice(0, 8);

  const topicIds: string[] = [];
  const pushId = (id: string) => {
    if (id && !topicIds.includes(id)) topicIds.push(id);
  };
  for (const card of selected) pushId(card.id);
  for (const card of selected) {
    for (const related of card.related) pushId(related);
  }
  for (const hit of searchTopics(task, store, { platform, limit: 5, readCache: false })) pushId(hit.id);

  const topicsToFetch = topicIds.slice(0, 3).map((id) => {
    const topic = store.topics.find((entry) => entry.id === id);
    const topicPath = topic?.path ?? `/design/human-interface-guidelines/${id}`;
    return {
      id,
      title: topic?.title ?? id,
      sourceUrl: sourceUrlForPath(topicPath),
    };
  });

  return {
    task,
    platform,
    checklist,
    references,
    topicsToFetch,
    note: "Call get_topic for each topicsToFetch entry before writing UI, and keep the Apple source URL in the answer.",
  };
}
