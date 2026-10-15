---
name: hig-help
description: Show HIG commands, their inputs, and client-specific invocation syntax. Use when the user asks for HIG help or command usage.
---

Call the HIG MCP `help` tool and show its command reference. Do not design or audit an interface.

Workflow names: hig-help, hig-topic, hig-web, hig-ios, hig-ipados, hig-macos, hig-watchos, hig-tvos, hig-visionos, hig-convert, hig-audit.

Design workflows take a task. Topic lookup takes a topic and optional platform. Convert and audit take the existing interface and platform.

Use the client's invocation syntax: Codex plugin skills use `$hig:hig-web`; Codex user-installed skills use `$hig-web`. Claude Code plugin skills use `/hig:hig-web`; Claude user-installed skills use `/hig-web`. MCP prompt labels may carry a client-controlled namespace.

Apple created and publishes the Human Interface Guidelines. This project helps apply Apple's guidance and does not claim authorship of the design system.
