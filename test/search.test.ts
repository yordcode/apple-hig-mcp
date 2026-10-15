import { expect, it } from "vitest";
import { loadStore } from "../src/catalog/load.js";
import { guideInterface } from "../src/guide.js";
import { matchesAlias, searchTopics } from "../src/search/search.js";

it("matches alias words and phrases without matching inside words", () => {
  expect(matchesAlias("A form, please", "form")).toBe(true);
  expect(matchesAlias("Use dark-mode", "dark mode")).toBe(true);
  expect(matchesAlias("information", "form")).toBe(false);
  expect(matchesAlias("stable", "tab")).toBe(false);
  const store = loadStore();
  for (const task of ["information", "stable"]) {
    expect(searchTopics(task, store, { readCache: false })).toEqual([]);
    expect(guideInterface(task, "web", store).references).toEqual(guideInterface(task, "web", { ...store, aliases: {} }).references);
  }
  expect(searchTopics("form", store, { readCache: false }).some(hit => hit.id === "text-fields")).toBe(true);
  expect(guideInterface("form", "web", store).references.length).toBeGreaterThan(0);
});
