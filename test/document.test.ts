import { describe, expect, it } from "vitest";

import { doccToPage } from "../src/content/docc.js";
import { renderBlocks, renderPage, selectBlocks } from "../src/content/document.js";

const fixture = {
  metadata: { title: "Example" },
  abstract: [{ type: "text", text: "A short abstract." }],
  references: {
    "doc://example/sheets": {
      type: "topic",
      title: "Sheets",
      url: "/design/human-interface-guidelines/sheets",
    },
  },
  primaryContentSections: [
    {
      kind: "content",
      content: [
        { type: "paragraph", inlineContent: [{ type: "image", identifier: "intro.png" }] },
        { type: "heading", level: 2, text: "Best practices" },
        {
          type: "paragraph",
          inlineContent: [
            { type: "text", text: "See " },
            { type: "reference", identifier: "doc://example/sheets" },
            { type: "text", text: "." },
          ],
        },
        { type: "heading", level: 2, text: "Platform considerations" },
        {
          type: "paragraph",
          inlineContent: [{ type: "text", text: "No additional considerations for tvOS." }],
        },
        { type: "heading", level: 3, text: "iOS, iPadOS" },
        { type: "paragraph", inlineContent: [{ type: "text", text: "Use a 44 point target." }] },
        { type: "heading", level: 3, text: "watchOS" },
        { type: "paragraph", inlineContent: [{ type: "text", text: "Keep it short." }] },
        { type: "heading", level: 2, text: "Resources" },
        { type: "paragraph", inlineContent: [{ type: "text", text: "Related topics." }] },
      ],
    },
  ],
};

describe("DocC markdown", () => {
  it("renders a table with adjacent rows", () => {
    expect(renderBlocks([{ type: "table", rows: [["Platform", "Size"], ["iOS", "17 pt"]] }])).toBe("| Platform | Size |\n| --- | --- |\n| iOS | 17 pt |");
  });

  it("keeps tabbed specifications and selects exact headings first", () => {
    const document = doccToPage({ primaryContentSections: [{ content: [{ type: "tabNavigator", tabs: [
      { title: "xSmall", content: [{ type: "heading", level: 4, text: "xSmall" }, { type: "paragraph", inlineContent: [{ type: "text", text: "Extra small" }] }] },
      { title: "Small", content: [{ type: "heading", level: 4, text: "Small" }, { type: "paragraph", inlineContent: [{ type: "text", text: "Small size" }] }] },
      { title: "Label only", content: [{ type: "paragraph", inlineContent: [{ type: "text", text: "Labelled body" }] }] },
    ] }] }] });
    const selected = selectBlocks(document.blocks, { section: "Small" });
    expect(renderPage(document.title, selected.blocks)).toContain("Small size");
    expect(renderPage(document.title, selected.blocks)).not.toContain("Extra small");
    expect(renderPage(document.title, document.blocks)).toContain("#### Label only");
  });

  it("filters nested platform specifications while preserving shared guidance", () => {
    const blocks = doccToPage({ primaryContentSections: [{ content: [
      { type: "heading", level: 2, text: "Specifications" },
      { type: "paragraph", inlineContent: [{ type: "text", text: "Shared specifications" }] },
      { type: "heading", level: 3, text: "iOS, iPadOS sizes" },
      { type: "paragraph", inlineContent: [{ type: "text", text: "Phone sizes" }] },
      { type: "heading", level: 3, text: "watchOS sizes" },
      { type: "heading", level: 4, text: "Small" },
      { type: "paragraph", inlineContent: [{ type: "text", text: "Watch sizes" }] },
      { type: "heading", level: 3, text: "Tracking values" },
      { type: "heading", level: 4, text: "macOS tracking" },
      { type: "paragraph", inlineContent: [{ type: "text", text: "Mac tracking" }] },
      { type: "heading", level: 4, text: "iOS, visionOS tracking" },
      { type: "paragraph", inlineContent: [{ type: "text", text: "Phone tracking" }] },
      { type: "heading", level: 2, text: "Resources" },
    ] }] }).blocks;
    const text = renderBlocks(selectBlocks(blocks, { platform: "ios" }).blocks);
    expect(text).toContain("Shared specifications");
    expect(text).toContain("Phone sizes");
    expect(text).toContain("Phone tracking");
    expect(text).toContain("Resources");
    expect(text).not.toContain("Watch sizes");
    expect(text).not.toContain("Mac tracking");
    const web = renderBlocks(selectBlocks(blocks, { platform: "web" }).blocks);
    expect(web).toContain("Shared specifications");
    expect(web).not.toContain("Phone sizes");
    expect(selectBlocks(blocks, { platform: "all" }).blocks).toEqual(blocks);
  });
  const page = doccToPage(fixture);

  it("drops images and links references", () => {
    const markdown = renderPage(page.title, page.blocks);
    expect(markdown).toContain("# Example");
    expect(markdown).toContain("[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)");
    expect(markdown).not.toContain("intro.png");
  });

  it("keeps the requested platform and later sections", () => {
    const selected = selectBlocks(page.blocks, { platform: "ios" });
    const markdown = renderPage(page.title, selected.blocks);
    expect(markdown).toContain("Use a 44 point target.");
    expect(markdown).toContain("Related topics.");
    expect(markdown).not.toContain("Keep it short.");
    expect(markdown).not.toContain("No additional considerations for tvOS.");
  });

  it("slices a heading", () => {
    const selected = selectBlocks(page.blocks, { section: "Best practices" });
    const markdown = renderPage(page.title, selected.blocks);
    expect(markdown).toContain("## Best practices");
    expect(markdown).not.toContain("Platform considerations");
  });

  it("does not expose another platform when selecting a subsection", () => {
    const selected = selectBlocks(page.blocks, { platform: "ios", section: "watchOS" });
    expect(selected.blocks).toEqual([]);
    expect(selected.note).toContain("No heading matched");
    const matching = selectBlocks(page.blocks, { platform: "ios", section: "iOS, iPadOS" });
    expect(renderPage(page.title, matching.blocks)).toContain("44 point");
  });

  it("names headings when a section is missing", () => {
    const selected = selectBlocks(page.blocks, { section: "Missing" });
    expect(selected.note).toContain("Best practices");
    expect(selected.blocks).toHaveLength(0);
  });
});
