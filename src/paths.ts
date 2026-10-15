import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(here, "..");
export const CATALOG_PATH = path.join(ROOT, "catalog", "topics.json");
export const PLATFORMS_PATH = path.join(ROOT, "catalog", "platforms.json");
export const ALIASES_PATH = path.join(ROOT, "catalog", "aliases.json");
export const CARDS_PATH = path.join(ROOT, "design-system", "cards.json");
export const CACHE_DIR = path.join(os.homedir(), ".cache", "hig");

export const INDEX_URL =
  "https://developer.apple.com/tutorials/data/index/design--human-interface-guidelines";
export const DATA_ORIGIN = "https://developer.apple.com/tutorials/data";
export const WEB_ORIGIN = "https://developer.apple.com";
export const USER_AGENT = "apple-hig-mcp/0.1 (local design reference)";
export const APPLE_ATTRIBUTION =
  "Apple's Human Interface Guidelines are published by Apple Inc.";
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
