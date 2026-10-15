export const HELP_COMMANDS = [
  { command: "/hig/help", use: "Show this help." },
  { command: "/hig/topic", use: "Read one guideline, such as buttons or sheets, without designing. Optional platform." },
  { command: "/hig/web", use: "Design a website or web app. Example task: design a card." },
  { command: "/hig/ios", use: "Design an iPhone interface." },
  { command: "/hig/ipados", use: "Design an iPad interface." },
  { command: "/hig/macos", use: "Design a Mac interface." },
  { command: "/hig/watchos", use: "Design an Apple Watch interface." },
  { command: "/hig/tvos", use: "Design an Apple TV interface." },
  { command: "/hig/visionos", use: "Design an Apple Vision Pro interface." },
  { command: "/hig/convert", use: "Rewrite an existing design so it follows the guidelines. Fill in the description and platform." },
  { command: "/hig/audit", use: "Check an existing design and list the fixes. Fill in the description and platform." },
] as const;

export function helpText(): string {
  const commands = HELP_COMMANDS.map((entry) => `${entry.command} — ${entry.use}`).join("\n");
  return [
    "HIG help",
    "",
    "These commands look up Apple's Human Interface Guidelines and community implementation notes inspired by Apple HIG.",
    "Reload MCP servers in Cursor if a command is missing.",
    "",
    "Commands",
    commands,
    "",
    "For a design command, put what you want designed in the task field. The command already sets the platform.",
    "Example: /hig/web with task \"design a card\".",
    "For /hig/topic, name the guideline, such as buttons or sheets. Add a platform to drop other platforms' notes.",
    "For /hig/convert and /hig/audit, paste the current screens, layout, controls, and copy, and name the platform.",
    "",
    "The agent then calls guide_interface, get_design_reference, and get_topic, and keeps the Apple source URL in the answer.",
    "It can also call search_hig to find a page, and list_topics to browse a section.",
    "Button samples: samples/buttons.html",
    "",
    "Apple's Human Interface Guidelines are published by Apple Inc.",
    "https://developer.apple.com/design/human-interface-guidelines",
  ].join("\n");
}
