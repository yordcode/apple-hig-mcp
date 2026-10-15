import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { loadStore } from "./catalog/load.js";
import { helpText } from "./help.js";
import { getDesignReference, getTopic, guide, listTopics, searchHig } from "./tools.js";
import type { PlatformFilter, Section } from "./types.js";

const platformSchema = z
  .enum(["web", "ios", "ipados", "macos", "watchos", "tvos", "visionos", "all"])
  .describe("Target platform. Use web for websites and web apps.");

const sectionSchema = z
  .enum(["getting-started", "foundations", "patterns", "components", "inputs", "technologies"])
  .describe("Top-level HIG section.");

function jsonResult(value: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true as const } : {}),
  };
}

function textResult(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    ...(isError ? { isError: true as const } : {}),
  };
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "hig",
    version: "0.2.0",
  });

  server.registerTool(
    "list_topics",
    {
      title: "List HIG topics",
      description:
        "List Apple Human Interface Guidelines topics. Filter by section, component group, or platform. Returns titles and official URLs, not article text.",
      inputSchema: z.object({
        section: sectionSchema.optional(),
        group: z
          .string()
          .optional()
          .describe("Component group slug, such as menus-and-actions or presentation."),
        platform: platformSchema.optional(),
        limit: z.number().int().min(1).max(300).optional(),
      }),
    },
    async (input) =>
      jsonResult(
        listTopics({
          section: input.section as Section | undefined,
          group: input.group,
          platform: input.platform as PlatformFilter | undefined,
          limit: input.limit,
        }),
      ),
  );

  server.registerTool(
    "search_hig",
    {
      title: "Search HIG",
      description:
        "Search the HIG catalog by title, section, and aliases such as modal, nav, or form. Returns matching topics and official URLs. Does not return full articles; call get_topic for those.",
      inputSchema: z.object({
        query: z.string().describe("Words to search for, such as sheet, sidebar, or dark mode."),
        section: sectionSchema.optional(),
        platform: platformSchema.optional(),
        limit: z.number().int().min(1).max(25).optional(),
      }),
    },
    async (input) =>
      jsonResult(
        searchHig({
          query: input.query,
          section: input.section as Section | undefined,
          platform: input.platform as PlatformFilter | undefined,
          limit: input.limit,
        }),
      ),
  );

  server.registerTool(
    "get_topic",
    {
      title: "Get HIG topic",
      description:
        "Fetch one Human Interface Guidelines article as Markdown, with the canonical Apple URL. Accepts a slug, path, or developer.apple.com URL. Use section to keep one heading, and platform to drop other platforms' notes.",
      inputSchema: z.object({
        topic: z.string().describe("Slug, HIG path, or full developer.apple.com URL."),
        platform: platformSchema.optional(),
        section: z
          .string()
          .optional()
          .describe("Heading to keep, such as Best practices or Platform considerations."),
      }),
    },
    async (input) => {
      const result = await getTopic({
        topic: input.topic,
        platform: input.platform as PlatformFilter | undefined,
        section: input.section,
      });
      return textResult(result.text, result.isError);
    },
  );

  server.registerTool(
    "get_design_reference",
    {
      title: "Get design reference",
      description:
        "Return community implementation notes inspired by Apple's HIG. Apple created the underlying design guidance. Notes include platform-tagged rules and web HTML/CSS guidance, with official Apple source links.",
      inputSchema: z.object({
        id: z.string().describe("Card id, such as buttons, color, sheets, or settings."),
        platform: platformSchema.optional(),
      }),
    },
    async (input) => {
      const result = getDesignReference({
        id: input.id,
        platform: input.platform as PlatformFilter | undefined,
      });
      return jsonResult(result.body, result.isError);
    },
  );

  server.registerTool(
    "guide_interface",
    {
      title: "Guide an interface",
      description:
        "Given a UI task and platform, return community implementation notes inspired by Apple's HIG, a short checklist, and two or three official Apple topics to fetch before writing the interface.",
      inputSchema: z.object({
        task: z.string().describe("What to design, such as settings screen, checkout sheet, or onboarding."),
        platform: platformSchema.optional(),
      }),
    },
    async (input) => {
      const result = guide({
        task: input.task,
        platform: input.platform as PlatformFilter | undefined,
      });
      return jsonResult(result.body, result.isError);
    },
  );

  server.registerResource(
    "hig-catalog",
    "hig://catalog",
    {
      title: "HIG catalog",
      description: "Navigation catalog for the Human Interface Guidelines.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(listTopics({}), null, 2),
        },
      ],
    }),
  );

  const catalog = listTopics({});
  const catalogTopics = (catalog as { topics: Array<{ id: string; title: string }> }).topics;

  server.registerResource(
    "hig-topic",
    new ResourceTemplate("hig://topic/{slug}", {
      list: async () => ({
        resources: catalogTopics.map((topic) => ({
          uri: `hig://topic/${topic.id}`,
          name: topic.title,
          mimeType: "text/markdown",
        })),
      }),
    }),
    {
      title: "HIG topic",
      description: "One Human Interface Guidelines article as Markdown.",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const result = await getTopic({ topic: one(variables.slug) });
      if (result.isError) throw new Error(result.text);
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: result.text }],
      };
    },
  );

  server.registerResource(
    "hig-reference",
    new ResourceTemplate("hig://reference/{id}", {
      list: async () => ({
        resources: loadStore().cards.map((card) => ({
          uri: `hig://reference/${card.id}`,
          name: card.title,
          mimeType: "application/json",
        })),
      }),
    }),
    {
      title: "Design reference",
      description: "Original foundation, component, or pattern card.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const result = getDesignReference({ id: one(variables.id) });
      if (result.isError) throw new Error(`Unknown design reference "${one(variables.id)}"`);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.body, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "help",
    {
      title: "HIG help",
      description: "Show how to use the HIG design commands and tools.",
      inputSchema: z.object({}),
    },
    async () => textResult(helpText()),
  );

  server.registerPrompt(
    "hig-help",
    {
      title: "HIG help",
      description: "Show how to use the HIG commands. No arguments.",
      argsSchema: z.object({}),
    },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Show this help to the user. Do not design anything.\n\n${helpText()}`,
          },
        },
      ],
    }),
  );

  const designPlatforms = [
    {
      id: "web",
      title: "Design for the web",
      label: "web",
      note: "Use semantic HTML, the system font stack, and each card's CSS notes.",
    },
    { id: "ios", title: "Design for iOS", label: "ios", note: "Follow iPhone layout, navigation, and hit targets." },
    { id: "ipados", title: "Design for iPadOS", label: "ipados", note: "Adapt layout for a regular width, including sidebars and split views." },
    { id: "macos", title: "Design for macOS", label: "macos", note: "Use window, sidebar, toolbar, and menu patterns for the desktop." },
    { id: "watchos", title: "Design for watchOS", label: "watchos", note: "Keep actions short and targets large enough for a watch." },
    { id: "tvos", title: "Design for tvOS", label: "tvos", note: "Design for focus and a remote across the room." },
    { id: "visionos", title: "Design for visionOS", label: "visionos", note: "Prefer system ornaments, comfortable spacing, and eye-target sizes." },
  ] as const;

  for (const platform of designPlatforms) {
    server.registerPrompt(
      `hig-${platform.id}`,
      {
        title: platform.title,
        description: `Design interface for ${platform.label} using Apple's Human Interface Guidelines. The only argument is the task.`,
        argsSchema: z.object({
          task: z
            .string()
            .optional()
            .describe("What to design, such as a card, settings screen, or checkout sheet."),
        }),
      },
      ({ task }) => ({
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Design this interface for ${platform.label} using Apple's Human Interface Guidelines.`,
                "",
                `Platform: ${platform.label}`,
                `Task: ${task?.trim() || "Use the interface the user described with this command."}`,
                platform.note,
                "",
                "Before writing UI:",
                `1. Call guide_interface with this task and platform "${platform.label}".`,
                "2. Call get_topic for each topic it cites, and keep the Apple source URL in the answer.",
                "3. Call get_design_reference for each component you will use, with the same platform.",
                "4. Apply the checklist.",
                "Do not copy Apple product chrome, logos, or San Francisco font files.",
              ].join("\n"),
            },
          },
        ],
      }),
    );
  }

  server.registerPrompt(
    "hig-topic",
    {
      title: "Look up a HIG topic",
      description: "Read one Human Interface Guidelines topic without designing or auditing.",
      argsSchema: z.object({
        topic: z
          .string()
          .optional()
          .describe("Topic name, slug, or alias, such as buttons, sheets, or modal."),
        platform: z
          .string()
          .optional()
          .describe("web, ios, ipados, macos, watchos, tvos, visionos, or all. Omit to keep every platform's notes."),
      }),
    },
    ({ topic, platform }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "Look up this Human Interface Guidelines topic. Do not design or audit an interface.",
              "",
              `Topic: ${topic?.trim() || "Use the topic the user named with this command."}`,
              `Platform: ${platform?.trim() || "all"}`,
              "",
              "1. Call search_hig when the name may be an alias, such as modal or nav.",
              "2. Call get_topic for the matching article and keep the Apple source URL.",
              "3. Call get_design_reference when a card exists for that topic, with the same platform.",
              "Summarize the guidance for the named platform. When the platform is all, keep each platform's notes.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  const existingDesign = z.object({
    description: z
      .string()
      .optional()
      .describe("The current interface: screens, layout, controls, and copy."),
    platform: z
      .string()
      .optional()
      .describe("web, ios, ipados, macos, watchos, tvos, visionos, or all."),
  });

  function existingDesignText(description?: string, platform?: string): string[] {
    return [
      `Design: ${description?.trim() || "Use the design the user described with this command."}`,
      `Platform: ${platform?.trim() || "Use the platform the user named. If none was named, ask which platform before fetching topics."}`,
    ];
  }

  server.registerPrompt(
    "hig-convert",
    {
      title: "Convert a design to HIG",
      description: "Rewrite an existing interface so it follows Apple's Human Interface Guidelines.",
      argsSchema: existingDesign,
    },
    ({ description, platform }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "Convert this existing interface so it follows Apple's Human Interface Guidelines.",
              "Keep the product's purpose and content. Change structure, components, hierarchy, targets, and copy where the guidelines require it.",
              "",
              ...existingDesignText(description, platform),
              "",
              "Before writing the converted UI:",
              "1. Call guide_interface with this design and platform.",
              "2. Call get_topic for each topic it cites, and keep the Apple source URL in the answer.",
              "3. Call get_design_reference for each component you will use, with the same platform.",
              "4. Deliver the converted interface, and name what changed.",
              "Do not copy Apple product chrome, logos, or San Francisco font files.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "hig-audit",
    {
      title: "Audit against HIG",
      description: "Check an existing interface against Apple's Human Interface Guidelines and list the fixes.",
      argsSchema: existingDesign,
    },
    ({ description, platform }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "Audit this existing interface against Apple's Human Interface Guidelines.",
              "Report what already meets the guidelines and what does not. For each miss, give the concrete fix. Do not redesign the whole interface.",
              "",
              ...existingDesignText(description, platform),
              "",
              "Call guide_interface, then get_topic for each cited page. Check hierarchy, hit targets, contrast, motion, copy, and modality. Cite the Apple source URL for each finding.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  return server;
}
