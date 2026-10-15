import { loadStore } from "./catalog/load.js";
import { formatTopic, loadTopic, sourceUrlForPath } from "./fetch/page.js";
import { findCard, guideInterface, presentCard } from "./guide.js";
import { platformAllows, searchTopics } from "./search/search.js";
import type { PlatformFilter, Section, Store } from "./types.js";

export interface ListTopicsInput {
  section?: Section;
  group?: string;
  platform?: PlatformFilter;
  limit?: number;
}

export interface SearchInput {
  query: string;
  section?: Section;
  platform?: PlatformFilter;
  limit?: number;
}

export interface GetTopicInput {
  topic: string;
  platform?: PlatformFilter;
  section?: string;
}

export interface ReferenceInput {
  id: string;
  platform?: PlatformFilter;
}

export interface GuideInput {
  task: string;
  platform?: PlatformFilter;
}

function storeOr(store?: Store): Store {
  return store ?? loadStore();
}

export function listTopics(input: ListTopicsInput, store = storeOr()): unknown {
  const platform = input.platform ?? "all";
  const group = input.group?.trim().toLowerCase();
  const topics = store.topics.filter((topic) => {
    if (input.section && topic.section !== input.section) return false;
    if (group && topic.group !== group && topic.id !== group) return false;
    return platformAllows(topic.platforms, platform);
  });
  const limited = topics.slice(0, input.limit ?? 200);
  return {
    count: limited.length,
    total: topics.length,
    topics: limited.map((topic) => ({
      id: topic.id,
      title: topic.title,
      section: topic.section,
      group: topic.group,
      kind: topic.kind,
      platforms: topic.platforms.length > 0 ? topic.platforms : ["all"],
      sourceUrl: sourceUrlForPath(topic.path),
    })),
  };
}

export function searchHig(input: SearchInput, store = storeOr()): unknown {
  const hits = searchTopics(input.query, store, {
    platform: input.platform,
    section: input.section,
    limit: input.limit,
  });
  return {
    query: input.query,
    platform: input.platform ?? "all",
    count: hits.length,
    hits,
  };
}

export async function getTopic(input: GetTopicInput, store = storeOr()): Promise<{ text: string; isError: boolean }> {
  try {
    const document = await loadTopic(input.topic, store.topics);
    const formatted = formatTopic(document, { platform: input.platform, section: input.section });
    return { text: formatted.text, isError: formatted.missingSection };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load that HIG topic.";
    return { text: message, isError: true };
  }
}

export function getDesignReference(input: ReferenceInput, store = storeOr()): { body: unknown; isError: boolean } {
  const card = findCard(input.id, store.cards);
  if (!card) {
    const ids = store.cards.map((entry) => entry.id).join(", ");
    return {
      isError: true,
      body: { error: `No design reference for "${input.id}".`, availableIds: ids },
    };
  }
  return { isError: false, body: presentCard(card, input.platform ?? "all") };
}

export function guide(input: GuideInput, store = storeOr()): { body: unknown; isError: boolean } {
  const platform = input.platform ?? "all";
  const result = guideInterface(input.task, platform, store);
  if (result.references.length === 0 && result.topicsToFetch.length === 0) {
    return {
      isError: true,
      body: {
        error: `No HIG match for "${input.task}". Try search_hig with a component or pattern name.`,
      },
    };
  }
  return { isError: false, body: result };
}
