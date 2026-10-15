import { PLATFORMS, type Platform, type PlatformFilter } from "../types.js";

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; inlines: Inline[] }
  | { type: "emphasis"; inlines: Inline[] }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "list"; ordered: boolean; items: Block[][] }
  | { type: "aside"; label: string; blocks: Block[] }
  | { type: "code"; text: string }
  | { type: "table"; rows: string[][] };

const PLATFORM_TOKENS: Record<Platform, string[]> = {
  web: ["web"],
  ios: ["ios"],
  ipados: ["ipados"],
  macos: ["macos"],
  watchos: ["watchos"],
  tvos: ["tvos"],
  visionos: ["visionos"],
};

export function normalizeHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mentionsPlatform(text: string, platform: Platform): boolean {
  const padded = ` ${normalizeHeading(text)} `;
  return PLATFORM_TOKENS[platform].some((token) => padded.includes(` ${token} `));
}

function headingMatchesPlatform(text: string, platform: Platform): boolean {
  const tokens = new Set(normalizeHeading(text).split(" ").filter(Boolean));
  return PLATFORM_TOKENS[platform].some((token) => tokens.has(token));
}

export function plainInlines(inlines: Inline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === "text" || inline.type === "code") return inline.text;
      if (inline.type === "link") return inline.text;
      return plainInlines(inline.inlines);
    })
    .join("");
}

export function plainBlocks(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return block.text;
        case "paragraph":
          return plainInlines(block.inlines);
        case "list":
          return block.items.map((item) => plainBlocks(item)).join(" ");
        case "aside":
          return plainBlocks(block.blocks);
        case "code":
          return block.text;
        case "table":
          return block.rows.flat().join(" ");
      }
    })
    .join("\n");
}

function renderInlines(inlines: Inline[]): string {
  return inlines
    .map((inline) => {
      switch (inline.type) {
        case "text":
          return inline.text;
        case "code":
          return `\`${inline.text}\``;
        case "strong":
          return `**${renderInlines(inline.inlines)}**`;
        case "emphasis":
          return `*${renderInlines(inline.inlines)}*`;
        case "link":
          return `[${inline.text}](${inline.href})`;
      }
    })
    .join("");
}

function tableCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

export function renderBlocks(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const level = Math.min(Math.max(block.level, 1), 6);
        parts.push(`${"#".repeat(level)} ${block.text}`);
        break;
      }
      case "paragraph": {
        const text = renderInlines(block.inlines).trim();
        if (text) parts.push(text);
        break;
      }
      case "list": {
        const lines: string[] = [];
        block.items.forEach((item, index) => {
          const rendered = renderBlocks(item).trim();
          if (!rendered) return;
          const marker = block.ordered ? `${index + 1}. ` : "- ";
          const [first, ...rest] = rendered.split("\n");
          lines.push(`${marker}${first ?? ""}`);
          for (const line of rest) lines.push(`  ${line}`);
        });
        if (lines.length) parts.push(lines.join("\n"));
        break;
      }
      case "aside": {
        const body = renderBlocks(block.blocks).trim();
        if (!body) break;
        const quoted = `**${block.label}:** ${body}`.replaceAll("\n", "\n> ");
        parts.push(`> ${quoted}`);
        break;
      }
      case "code":
        parts.push(`\`\`\`\n${block.text}\n\`\`\``);
        break;
      case "table": {
        if (block.rows.length === 0) break;
        const width = Math.max(...block.rows.map((row) => row.length));
        const normalized = block.rows.map((row) =>
          Array.from({ length: width }, (_, index) => tableCell(row[index] ?? "")),
        );
        const header = normalized[0] ?? [];
        parts.push([
          `| ${header.join(" | ")} |`,
          `| ${header.map(() => "---").join(" | ")} |`,
          ...normalized.slice(1).map((row) => `| ${row.join(" | ")} |`),
        ].join("\n"));
        break;
      }
    }
  }
  return parts.join("\n\n");
}

export function renderPage(title: string, blocks: Block[]): string {
  const body = renderBlocks(blocks).trim();
  return body ? `# ${title}\n\n${body}` : `# ${title}`;
}

function sliceToHeading(blocks: Block[], section: string): Block[] | null {
  const query = normalizeHeading(section);
  if (!query) return null;
  const exact = blocks.findIndex((block) => block.type === "heading" && normalizeHeading(block.text) === query);
  const index = exact >= 0 ? exact : blocks.findIndex(
    (block) =>
      block.type === "heading" &&
      (normalizeHeading(block.text) === query || normalizeHeading(block.text).includes(query)),
  );
  if (index < 0) return null;
  const heading = blocks[index];
  if (!heading || heading.type !== "heading") return null;
  let end = blocks.length;
  for (let cursor = index + 1; cursor < blocks.length; cursor += 1) {
    const block = blocks[cursor];
    if (block?.type === "heading" && block.level <= heading.level) {
      end = cursor;
      break;
    }
  }
  return blocks.slice(index, end);
}

function filterPlatformConsiderations(blocks: Block[], platform: Platform): Block[] {
  const kept: Block[] = [];
  let droppedLevel: number | undefined;
  for (const block of blocks) {
    if (block.type === "heading") {
      if (droppedLevel !== undefined && block.level > droppedLevel) continue;
      droppedLevel = undefined;
      if (platform === "web" && normalizeHeading(block.text) === "platform considerations") {
        kept.push(block, { type: "paragraph", inlines: [{ type: "text", text: "Native platform notes are omitted for web. Call get_design_reference for the web mapping of this topic." }] });
        droppedLevel = block.level;
        continue;
      }
      const namedPlatforms = PLATFORMS.filter((entry) => headingMatchesPlatform(block.text, entry));
      if (namedPlatforms.length > 0 && !namedPlatforms.includes(platform)) {
        droppedLevel = block.level;
        continue;
      }
    }
    if (droppedLevel !== undefined) continue;
    if (block.type === "paragraph") {
      const text = plainInlines(block.inlines);
      if (/no additional considerations for/i.test(text) && !mentionsPlatform(text, platform)) continue;
    }
    kept.push(block);
  }
  return kept;
}

export function headingList(blocks: Block[]): string[] {
  return blocks.filter((block) => block.type === "heading").map((block) => block.text);
}

export function selectBlocks(
  blocks: Block[],
  options: { platform?: PlatformFilter; section?: string },
): { blocks: Block[]; note?: string } {
  let current = blocks;
  if (options.platform && options.platform !== "all") {
    current = filterPlatformConsiderations(current, options.platform);
  }
  if (options.section) {
    const sliced = sliceToHeading(current, options.section);
    if (!sliced) {
      return {
        blocks: [],
        note: `No heading matched "${options.section}". Headings: ${headingList(blocks).join(", ")}`,
      };
    }
    current = sliced;
  }
  return { blocks: current };
}
