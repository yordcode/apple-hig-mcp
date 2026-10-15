import { WEB_ORIGIN } from "../paths.js";
import type { Block, Inline } from "./document.js";

interface DoccReference {
  type?: string;
  title?: string;
  url?: string;
  alt?: string;
}

interface Context {
  references: Record<string, DoccReference>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function inlinesFrom(value: unknown, context: Context): Inline[] {
  if (!Array.isArray(value)) return [];
  const inlines: Inline[] = [];
  for (const node of value) {
    if (!isRecord(node)) continue;
    switch (node.type) {
      case "text":
        if (typeof node.text === "string" && node.text.length > 0) {
          inlines.push({ type: "text", text: node.text });
        }
        break;
      case "codeVoice":
      case "code":
        inlines.push({ type: "code", text: String(node.code ?? node.text ?? "") });
        break;
      case "strong":
        inlines.push({ type: "strong", inlines: inlinesFrom(node.inlineContent, context) });
        break;
      case "emphasis":
        inlines.push({ type: "emphasis", inlines: inlinesFrom(node.inlineContent, context) });
        break;
      case "reference":
        inlines.push(referenceInline(node, context));
        break;
      case "image":
        break;
      default:
        if (typeof node.text === "string") inlines.push({ type: "text", text: node.text });
        else if (node.inlineContent) inlines.push(...inlinesFrom(node.inlineContent, context));
    }
  }
  return inlines;
}

function referenceInline(node: Record<string, unknown>, context: Context): Inline {
  const identifier = typeof node.identifier === "string" ? node.identifier : "";
  const reference = context.references[identifier];
  const text =
    (typeof node.overridingTitle === "string" && node.overridingTitle) ||
    reference?.title ||
    "link";
  const url = reference?.url;
  if (!url) return { type: "text", text };
  const href = url.startsWith("/") ? `${WEB_ORIGIN}${url}` : url;
  return { type: "link", text, href };
}

function paragraphHasText(inlines: Inline[]): boolean {
  return inlines.some((inline) => {
    if (inline.type === "text" || inline.type === "code" || inline.type === "link") {
      return inline.text.trim().length > 0;
    }
    return paragraphHasText(inline.inlines);
  });
}

function blocksFrom(value: unknown, context: Context): Block[] {
  if (!Array.isArray(value)) return [];
  const blocks: Block[] = [];
  for (const node of value) {
    if (!isRecord(node)) continue;
    switch (node.type) {
      case "paragraph": {
        const inlines = inlinesFrom(node.inlineContent, context);
        if (paragraphHasText(inlines)) blocks.push({ type: "paragraph", inlines });
        break;
      }
      case "heading": {
        const text = typeof node.text === "string" ? node.text : "";
        const level = typeof node.level === "number" ? node.level : 2;
        if (text) blocks.push({ type: "heading", level, text });
        break;
      }
      case "unorderedList":
      case "orderedList":
        blocks.push({
          type: "list",
          ordered: node.type === "orderedList",
          items: Array.isArray(node.items)
            ? node.items
                .filter(isRecord)
                .map((item) => blocksFrom(item.content, context))
                .filter((item) => item.length > 0)
            : [],
        });
        break;
      case "aside":
        blocks.push({
          type: "aside",
          label: typeof node.name === "string" && node.name ? node.name : "Note",
          blocks: blocksFrom(node.content, context),
        });
        break;
      case "codeListing": {
        const code = Array.isArray(node.code) ? node.code.map(String).join("\n") : String(node.code ?? "");
        blocks.push({ type: "code", text: code });
        break;
      }
      case "table":
        blocks.push({ type: "table", rows: tableRows(node.rows, context) });
        break;
      case "tabNavigator":
        for (const tab of Array.isArray(node.tabs) ? node.tabs : []) {
          if (!isRecord(tab)) continue;
          const content = blocksFrom(tab.content, context);
          if (typeof tab.title === "string" && content[0]?.type !== "heading") {
            blocks.push({ type: "heading", level: 4, text: tab.title });
          }
          blocks.push(...content);
        }
        break;
      case "row":
        if (Array.isArray(node.columns)) {
          for (const column of node.columns) {
            if (isRecord(column)) blocks.push(...blocksFrom(column.content, context));
          }
        }
        break;
      case "image":
      case "video":
        break;
      default:
        if (Array.isArray(node.content)) blocks.push(...blocksFrom(node.content, context));
    }
  }
  return blocks;
}

function tableRows(value: unknown, context: Context): string[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (!Array.isArray(row)) return [];
    return row.map((cell) => {
      const blocks = blocksFrom(cell, context);
      return blocks
        .map((block) => {
          if (block.type === "paragraph") return inlinesToPlain(block.inlines);
          if (block.type === "heading") return block.text;
          return "";
        })
        .filter(Boolean)
        .join(" ");
    });
  });
}

function inlinesToPlain(inlines: Inline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === "text" || inline.type === "code" || inline.type === "link") return inline.text;
      return inlinesToPlain(inline.inlines);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DoccPage {
  title: string;
  blocks: Block[];
}

export function doccToPage(data: unknown): DoccPage {
  if (!isRecord(data)) throw new Error("DocC payload was not an object");
  const metadata = isRecord(data.metadata) ? data.metadata : {};
  const title = typeof metadata.title === "string" ? metadata.title : "Human Interface Guidelines";
  const references = isRecord(data.references) ? (data.references as Record<string, DoccReference>) : {};
  const context: Context = { references };
  const blocks: Block[] = [];
  const abstract = inlinesFrom(data.abstract, context);
  if (paragraphHasText(abstract)) blocks.push({ type: "paragraph", inlines: abstract });

  const sections = Array.isArray(data.primaryContentSections) ? data.primaryContentSections : [];
  for (const section of sections) {
    if (!isRecord(section)) continue;
    blocks.push(...blocksFrom(section.content, context));
  }
  if (blocks.length === 0) {
    throw new Error(`DocC page "${title}" did not include readable content`);
  }
  return { title, blocks };
}
