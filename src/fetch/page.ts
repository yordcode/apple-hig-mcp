import fs from "node:fs";
import path from "node:path";
import { z } from "zod/v4";

import { slugFromPath } from "../catalog/flatten.js";
import { doccToPage } from "../content/docc.js";
import { renderPage, selectBlocks } from "../content/document.js";
import type { Block } from "../content/document.js";
import {
  APPLE_ATTRIBUTION,
  CACHE_DIR,
  CACHE_TTL_MS,
  DATA_ORIGIN,
  USER_AGENT,
  WEB_ORIGIN,
} from "../paths.js";
import type { PlatformFilter, Topic } from "../types.js";

interface CacheRecord {
  version: 1;
  fetchedAt: string;
  sourceUrl: string;
  dataUrl: string;
  title: string;
  blocks: Block[];
}

const inlineSchema: z.ZodType<import("../content/document.js").Inline> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("code"), text: z.string() }),
  z.object({ type: z.literal("link"), text: z.string(), href: z.string() }),
  z.object({ type: z.literal("strong"), inlines: z.array(inlineSchema) }),
  z.object({ type: z.literal("emphasis"), inlines: z.array(inlineSchema) }),
]));
const blockSchema: z.ZodType<Block> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), level: z.number().int().min(1).max(6), text: z.string() }),
  z.object({ type: z.literal("paragraph"), inlines: z.array(inlineSchema) }),
  z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(z.array(blockSchema)) }),
  z.object({ type: z.literal("aside"), label: z.string(), blocks: z.array(blockSchema) }),
  z.object({ type: z.literal("code"), text: z.string() }),
  z.object({ type: z.literal("table"), rows: z.array(z.array(z.string())) }),
]));
const cacheSchema = z.object({
  version: z.literal(1),
  fetchedAt: z.iso.datetime(), sourceUrl: z.string(), dataUrl: z.string(),
  title: z.string(), blocks: z.array(blockSchema),
});
export const FETCH_TIMEOUT_MS = 10_000;

function validId(id: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Invalid HIG topic identifier");
  return id;
}

export interface TopicDocument {
  id: string;
  title: string;
  path: string;
  sourceUrl: string;
  blocks: Block[];
  stale: boolean;
}

let fetchQueue: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = fetchQueue.then(task, task);
  fetchQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function sourceUrlForPath(topicPath: string): string {
  return `${WEB_ORIGIN}${topicPath}`;
}

export function resolveTopicQuery(input: string, topics: Topic[]): { id: string; path: string; title?: string } {
  const trimmed = input.trim();
  let topicPath = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    if (url.origin !== WEB_ORIGIN || url.username || url.password) throw new Error("Expected an HTTPS developer.apple.com URL");
    topicPath = url.pathname.replace(/\.json$/, "").replace(/\/$/, "");
  }
  if (topicPath.startsWith("/design/human-interface-guidelines")) {
    if (!/^\/design\/human-interface-guidelines(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(topicPath)) throw new Error("Invalid HIG topic path");
    const id = validId(slugFromPath(topicPath));
    const topic = topics.find((entry) => entry.path === topicPath || entry.id === id);
    return { id: topic?.id ?? id, path: topic?.path ?? topicPath, title: topic?.title };
  }

  const normalized = trimmed.toLowerCase();
  const slug = normalized.replace(/\s+/g, "-");
  const topic = topics.find((entry) => entry.id === slug || entry.title.toLowerCase() === normalized);
  if (!topic) {
    validId(slug);
    return { id: slug, path: `/design/human-interface-guidelines/${slug}` };
  }
  return { id: topic.id, path: topic.path, title: topic.title };
}

function cachePath(id: string): string {
  return path.join(CACHE_DIR, `${validId(id)}.json`);
}

function readCache(id: string, topicPath = `/design/human-interface-guidelines/${id}`): CacheRecord | null {
  const filePath = cachePath(id);
  if (!fs.existsSync(filePath)) return null;
  try {
    const result = cacheSchema.safeParse(JSON.parse(fs.readFileSync(filePath, "utf8")));
    if (!result.success || Date.parse(result.data.fetchedAt) > Date.now()) return null;
    if (result.data.sourceUrl !== sourceUrlForPath(topicPath) || result.data.dataUrl !== `${DATA_ORIGIN}${topicPath}.json`) return null;
    return result.data;
  } catch {
    return null;
  }
}

function writeCache(id: string, record: CacheRecord): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath(id), `${JSON.stringify(record)}\n`, "utf8");
}

function isFresh(record: CacheRecord): boolean {
  return Date.now() - Date.parse(record.fetchedAt) < CACHE_TTL_MS;
}

async function fetchDocc(dataUrl: string): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Apple HIG request timed out"));
    }, FETCH_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      deadline,
      (async () => {
        const response = await fetch(dataUrl, {
          signal: controller.signal,
          headers: { Accept: "application/json", "User-Agent": USER_AGENT },
          redirect: "follow",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${dataUrl}`);
        return await response.json();
      })(),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

async function loadTopicOnce(input: string, topics: Topic[]): Promise<TopicDocument> {
  const resolved = resolveTopicQuery(input, topics);
  const sourceUrl = sourceUrlForPath(resolved.path);
  const dataUrl = `${DATA_ORIGIN}${resolved.path}.json`;
  const cached = readCache(resolved.id, resolved.path);
  if (cached && isFresh(cached)) {
    return {
      id: resolved.id,
      title: cached.title,
      path: resolved.path,
      sourceUrl: cached.sourceUrl,
      blocks: cached.blocks,
      stale: false,
    };
  }

  try {
    const page = await enqueue(async () => doccToPage(await fetchDocc(dataUrl)));
    const record: CacheRecord = {
      version: 1,
      fetchedAt: new Date().toISOString(),
      sourceUrl,
      dataUrl,
      title: page.title,
      blocks: page.blocks,
    };
    try {
      writeCache(resolved.id, record);
    } catch {
      console.error("hig: could not persist article cache; returning fresh content");
    }
    return {
      id: resolved.id,
      title: page.title,
      path: resolved.path,
      sourceUrl,
      blocks: page.blocks,
      stale: false,
    };
  } catch (error) {
    if (cached) {
      return {
        id: resolved.id,
        title: cached.title,
        path: resolved.path,
        sourceUrl: cached.sourceUrl,
        blocks: cached.blocks,
        stale: true,
      };
    }
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    throw new Error(`Could not fetch ${sourceUrl}. ${message}`);
  }
}

const pendingTopics = new Map<string, Promise<TopicDocument>>();

export async function loadTopic(input: string, topics: Topic[]): Promise<TopicDocument> {
  const key = resolveTopicQuery(input, topics).path;
  let pending = pendingTopics.get(key);
  if (!pending) {
    pending = loadTopicOnce(input, topics).finally(() => pendingTopics.delete(key));
    pendingTopics.set(key, pending);
  }
  return pending;
}

export function formatTopic(
  document: TopicDocument,
  options: { platform?: PlatformFilter; section?: string },
): { text: string; missingSection: boolean } {
  const selected = selectBlocks(document.blocks, options);
  if (selected.note && selected.blocks.length === 0) {
    return {
      missingSection: true,
      text: [`Source: ${document.sourceUrl}`, APPLE_ATTRIBUTION, "", selected.note].join("\n"),
    };
  }
  const page = renderPage(document.title, selected.blocks);
  const lines = [`Source: ${document.sourceUrl}`, APPLE_ATTRIBUTION];
  if (document.stale) {
    lines.push("Cached copy shown because a refresh failed. Re-run the request when the network is available.");
  }
  if (selected.note) lines.push(selected.note);
  lines.push("", page);
  return { missingSection: false, text: lines.join("\n") };
}

export function cachedPlainText(id: string): string | null {
  const cached = readCache(id);
  if (!cached) return null;
  return `${cached.title}\n${renderPage(cached.title, cached.blocks)}`;
}
