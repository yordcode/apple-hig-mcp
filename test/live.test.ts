import fs from "node:fs";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/paths.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/paths.js")>();
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  return { ...original, CACHE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "hig-live-")) };
});

import { loadStore } from "../src/catalog/load.js";
import { getTopic } from "../src/tools.js";
import { CACHE_DIR } from "../src/paths.js";

const live = process.env.LIVE_HIG === "1";
afterEach(() => vi.restoreAllMocks());
afterAll(() => fs.rmSync(CACHE_DIR, { recursive: true, force: true }));

describe.skipIf(!live)("live HIG fetch", () => {
  it("fetches the Buttons page and keeps the canonical URL", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    const store = loadStore();
    const result = await getTopic({ topic: "buttons", platform: "ios", section: "Best practices" }, store);
    expect(result.isError).toBe(false);
    expect(result.text).toContain("https://developer.apple.com/design/human-interface-guidelines/buttons");
    expect(result.text).toContain("Apple's Human Interface Guidelines are published by Apple Inc.");
    expect(result.text).toContain("## Best practices");
    expect(network).toHaveBeenCalledTimes(1);
    expect(result.text).not.toContain("Cached copy shown");
  }, 20000);

  it("reads tabbed typography sizes and filters platform specifications", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    const result = await getTopic({ topic: "typography", platform: "ios" });
    expect(result.isError).toBe(false);
    expect(network).toHaveBeenCalledTimes(1);
    expect(result.text).toContain("#### Small");
    expect(result.text).toContain("| Style | Weight |");
    expect(result.text).not.toContain("watchOS Dynamic Type sizes");
    expect(result.text).not.toContain("macOS built-in text styles");
    expect(result.text).not.toMatch(/\|\n\n\|/);
  }, 20000);
});
