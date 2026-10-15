import { describe, expect, it } from "vitest";

import { loadStore } from "../src/catalog/load.js";
import { guide, listTopics, searchHig } from "../src/tools.js";

const store = loadStore();

describe("catalog tools", () => {
  it("lists component articles from the synced catalog", () => {
    const result = listTopics({ section: "components", group: "menus-and-actions" }, store) as {
      topics: Array<{ id: string; group: string | null }>;
    };
    expect(result.topics.some((topic) => topic.id === "buttons" && topic.group === "menus-and-actions")).toBe(true);
  });

  it("searches sheet to the sheets topic", () => {
    const result = searchHig({ query: "sheet", platform: "web" }, store) as {
      hits: Array<{ id: string; sourceUrl: string }>;
    };
    expect(result.hits[0]?.id).toBe("sheets");
    expect(result.hits[0]?.sourceUrl).toBe("https://developer.apple.com/design/human-interface-guidelines/sheets");
  });

  it("guides a web settings screen", () => {
    const result = guide({ task: "settings screen", platform: "web" }, store);
    expect(result.isError).toBe(false);
    const body = result.body as {
      checklist: string[];
      references: Array<{ id: string; web?: { element: string } }>;
      topicsToFetch: Array<{ id: string; sourceUrl: string }>;
    };
    expect(body.references.some((card) => card.id === "settings")).toBe(true);
    expect(body.references.find((card) => card.id === "settings")?.web?.element).toBe("form");
    expect(body.checklist.length).toBeGreaterThan(0);
    expect(body.checklist.some((line) => line.startsWith("Settings:"))).toBe(true);
    expect(body.topicsToFetch.length).toBeGreaterThanOrEqual(2);
    expect(body.topicsToFetch.length).toBeLessThanOrEqual(3);
    expect(body.topicsToFetch[0]?.sourceUrl).toContain("https://developer.apple.com/design/human-interface-guidelines/");
  });

  it("hides watch-only topics from a web search", () => {
    const result = searchHig({ query: "complications", platform: "web" }, store) as {
      hits: Array<{ id: string }>;
    };
    expect(result.hits.some((hit) => hit.id === "complications")).toBe(false);
  });
});
