import fs from "node:fs";
import path from "node:path";

import { flattenIndex, readIndexRoot } from "../src/catalog/flatten.js";
import { CATALOG_PATH, INDEX_URL, USER_AGENT } from "../src/paths.js";

const response = await fetch(INDEX_URL, {
  signal: AbortSignal.timeout(10_000),
  headers: {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  },
});

if (!response.ok) {
  throw new Error(`HIG index request failed with HTTP ${response.status}`);
}

const topics = flattenIndex(readIndexRoot(await response.json()));
const catalog = {
  source: INDEX_URL,
  generatedAt: new Date().toISOString(),
  topics,
};

fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.error(`Wrote ${topics.length} topics to ${CATALOG_PATH}`);
