import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cachedPlainText, FETCH_TIMEOUT_MS, loadTopic, resolveTopicQuery } from "../src/fetch/page.js";
import { DATA_ORIGIN, WEB_ORIGIN } from "../src/paths.js";

const payload = { metadata: { title: "Fresh" }, abstract: [{ type: "text", text: "Fresh article" }] };
const cache = (overrides = {}) => JSON.stringify({
  version: 1,
  fetchedAt: "2020-01-01T00:00:00.000Z",
  sourceUrl: `${WEB_ORIGIN}/design/human-interface-guidelines/buttons`,
  dataUrl: `${DATA_ORIGIN}/design/human-interface-guidelines/buttons.json`,
  title: "Old", blocks: [{ type: "paragraph", inlines: [{ type: "text", text: "Old article" }] }],
  ...overrides,
});

beforeEach(() => {
  vi.spyOn(fs, "existsSync").mockReturnValue(false);
  vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
  vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("topic and cache boundaries", () => {
  it.each(["../../escape", "..\\escape", "", "buttons/../../escape", "%2e%2e", "/design/human-interface-guidelines-bad/buttons", "https://example.com/design/human-interface-guidelines/buttons"])("rejects %s before reading or fetching", async (input) => {
    await expect(loadTopic(input, [])).rejects.toThrow();
    expect(fs.existsSync).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts canonical Apple URLs and human-readable slugs", () => {
    expect(resolveTopicQuery(`${WEB_ORIGIN}/design/human-interface-guidelines/buttons/`, []).id).toBe("buttons");
    expect(resolveTopicQuery("Dark Mode", []).id).toBe("dark-mode");
  });
  it.each(["not json", cache({ blocks: [{}] }), cache({ sourceUrl: "https://example.com" }), cache({ fetchedAt: "invalid" })])("ignores malformed or untrusted cache", async (contents) => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(contents);
    expect(cachedPlainText("buttons")).toBeNull();
    expect((await loadTopic("buttons", [])).title).toBe("Fresh");
  });
  it("returns fresh content even when persistence fails", async () => {
    vi.mocked(fs.writeFileSync).mockImplementation(() => { throw new Error("EACCES"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loadTopic("buttons", [])).toMatchObject({ title: "Fresh", stale: false });
  });
});

describe("fetch deadlines", () => {
  it("shares simultaneous topic requests and retries after failure", async () => {
    const results = await Promise.all([loadTopic("buttons", []), loadTopic("buttons", []), loadTopic(`${WEB_ORIGIN}/design/human-interface-guidelines/buttons`, [])]);
    expect(results.map(result => result.title)).toEqual(["Fresh", "Fresh", "Fresh"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    await expect(loadTopic("buttons", [])).rejects.toThrow("offline");
    expect((await loadTopic("buttons", [])).title).toBe("Fresh");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("refreshes old parser caches", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(cache({ version: undefined, fetchedAt: new Date().toISOString() }));
    expect((await loadTopic("buttons", [])).title).toBe("Fresh");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("releases the queue after a stalled response body and aborts it", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementationOnce(async (_url, init) => {
      signal = init?.signal as AbortSignal;
      return { ok: true, json: () => new Promise(() => {}) } as Response;
    });
    const first = loadTopic("buttons", []).catch(error => error);
    const second = loadTopic("sheets", []);
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);
    expect((await first).message).toContain("timed out");
    expect(signal?.aborted).toBe(true);
    expect((await second).title).toBe("Fresh");
  });
  it("serves a stale article when a fetch stalls", async () => {
    vi.useFakeTimers();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(cache());
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const result = loadTopic("buttons", []);
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);
    expect(await result).toMatchObject({ title: "Old", stale: true });
  });
});
