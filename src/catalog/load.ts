import fs from "node:fs";

import { ALIASES_PATH, CARDS_PATH, CATALOG_PATH, PLATFORMS_PATH } from "../paths.js";
import type { CatalogFile, DesignCard, Platform, Store, Topic } from "../types.js";
import { PLATFORMS } from "../types.js";

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function asPlatforms(value: unknown, id: string): Platform[] {
  if (!Array.isArray(value)) {
    throw new Error(`Platform overlay for "${id}" must be an array`);
  }
  return value.map((entry) => {
    if (!PLATFORMS.includes(entry as Platform)) {
      throw new Error(`Unknown platform "${String(entry)}" on "${id}"`);
    }
    return entry as Platform;
  });
}

export function loadStore(): Store {
  const catalog = readJson<CatalogFile>(CATALOG_PATH);
  const platformOverlay = readJson<Record<string, unknown>>(PLATFORMS_PATH);
  const aliases = readJson<Record<string, string[]>>(ALIASES_PATH);
  const cards = readJson<DesignCard[]>(CARDS_PATH);

  const topics: Topic[] = catalog.topics.map((topic) => ({
    ...topic,
    platforms: topic.id in platformOverlay ? asPlatforms(platformOverlay[topic.id], topic.id) : [],
  }));

  return {
    generatedAt: catalog.generatedAt,
    topics,
    aliases,
    cards,
  };
}
