# Apple HIG MCP

Bring Apple's Human Interface Guidelines into your AI coding workflow.

A local [Model Context Protocol](https://modelcontextprotocol.io) server for Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines). Cursor, Claude, and Codex can search the full guideline catalog, fetch an article as Markdown, and read community implementation notes inspired by Apple HIG for native apps and the web.

## Commands

These workflows use Apple's Human Interface Guidelines and cite the official sources. For design commands, provide what you want to build in the `task` field; the command already selects the platform.

| Command | What it does |
| --- | --- |
| `/hig/help` | Show the available commands and how to use them. No input required. |
| `/hig/topic` | Read and summarize one guideline without designing or auditing. Provide a `topic`, such as `buttons`, `sheets`, or `modal`, and an optional `platform`. Omit the platform to retain all platforms' notes. |
| `/hig/web` | Design a website or web app using Apple HIG as a reference, with semantic HTML, CSS implementation notes, and accessibility guidance. Provide a `task`, such as `design a checkout form`. |
| `/hig/ios` | Design an iPhone interface using the relevant navigation, layout, and touch-target guidance. Provide a `task`. |
| `/hig/ipados` | Design an iPad interface with layouts suited to wider screens, sidebars, and split views. Provide a `task`. |
| `/hig/macos` | Design a Mac interface using desktop window, sidebar, toolbar, and menu patterns. Provide a `task`. |
| `/hig/watchos` | Design an Apple Watch interface with short interactions and suitable controls and touch targets. Provide a `task`. |
| `/hig/tvos` | Design an Apple TV interface for remote navigation, focus, and viewing from across the room. Provide a `task`. |
| `/hig/visionos` | Design an Apple Vision Pro interface using spatial layout, system ornaments, and comfortable target spacing. Provide a `task`. |
| `/hig/convert` | Adapt an existing interface to follow Apple HIG while preserving its purpose and content. Provide a `description` of the current design and a `platform`. Returns the converted interface and explains what changed. |
| `/hig/audit` | Check an existing interface against Apple HIG without redesigning it. Provide a `description` and a `platform`. Reports what meets the guidance, what needs fixing, and concrete fixes with Apple source links. |

**Command names depend on your assistant.** The `/hig/...` labels above are the Cursor MCP prompt names. Claude Code exposes these prompts using its own namespace. Codex plugin installation supplies the MCP tools; it does not automatically create `/hig/...` slash commands. In Codex, ask for a workflow in plain language, or use the optional [Codex prompt files](.codex/prompts/) described below.

For example, select `/hig/web` and set `task` to `design an accessible settings screen`. In Codex, ask: **“Use hig to design an accessible settings screen for the web. Fetch the relevant Apple guidelines first and cite them.”**

## Tools

| Tool | Purpose |
| --- | --- |
| `list_topics` | List topics by section, component group, or platform. |
| `search_hig` | Search titles and aliases such as `modal`, `nav`, and `form`. |
| `get_topic` | Fetch one article. Accepts a slug, path, or `developer.apple.com` URL. |
| `get_design_reference` | Return community implementation notes inspired by Apple's HIG. |
| `guide_interface` | For a task and platform, return a checklist and the topics to fetch next. |
| `help` | Show command and workflow guidance. |

`platform` is `web`, `ios`, `ipados`, `macos`, `watchos`, `tvos`, `visionos`, or `all`.

Every `get_topic` result includes the canonical Apple URL and states that the guidelines are published by Apple. Web notes translate hierarchy, targets, type roles, and component behavior into HTML and CSS. They do not reproduce Apple product chrome, and they do not bundle San Francisco or SF Symbols artwork.

## Setup

### Easy plugin install

Requires Node.js 20 or newer and Git on your `PATH`. The plugin includes the built MCP server, so no manual clone, npm install, build, or path editing is needed.

**Claude Code** — run these as separate commands inside Claude Code:

```text
/plugin marketplace add yord-dev/apple-hig-mcp
/plugin install hig@hig
```

**Codex** — run these in your terminal:

```bash
codex plugin marketplace add yord-dev/apple-hig-mcp
codex plugin add hig@hig
```

Reload plugins or restart your assistant, then ask: **“Use hig to design an accessible settings screen for the web. Fetch Apple's relevant guidelines first and cite them.”** The plugin name and marketplace name are both `hig`, so its install ID is `hig@hig`.

Choose either plugin installation or manual MCP setup below to avoid registering the same server twice. Marketplace installation applies to Claude Code and Codex; Cursor and Claude Desktop can use manual MCP configuration.

### Manual setup and development

Start with the **[step-by-step setup and usage guide](docs/GETTING_STARTED.md)** for client configuration, examples, verification, and troubleshooting.

Requires Node.js 20 or newer.

```bash
git clone https://github.com/yord-dev/apple-hig-mcp.git
cd apple-hig-mcp
npm ci
npm test
npm run build
npm start
```

The catalog is included; `npm run sync-catalog` is only needed to refresh navigation metadata. The server supplies reference material and checklists; your assistant performs the design and coding. No API key is required by this server.

The process speaks stdio and logs only to stderr. Catalog files are resolved from this package, so the launch path is absolute and does not depend on the agent's working directory. Node.js 20 or newer must be on `PATH`.

## Install in an agent

The server key is `hig`. Replace the path if you move this repo.

### Cursor

Create `.cursor/mcp.json` in your application project, or add the entry to your Cursor user MCP settings. Reload MCP servers after editing. Workstation-specific configuration files are intentionally excluded from this repository.

```json
{
  "mcpServers": {
    "hig": {
      "command": "node",
      "args": ["/absolute/path/to/apple-hig-mcp/dist/index.js"]
    }
  }
}
```

Cursor slash commands are `/hig/help`, `/hig/topic`, `/hig/web`, `/hig/ios`, `/hig/ipados`, `/hig/macos`, `/hig/watchos`, `/hig/tvos`, `/hig/visionos`, `/hig/convert`, and `/hig/audit`.

### Claude Code

Create `.mcp.json` in your application project. Claude Code reads it when a session starts and asks you to approve the server the first time. Merge the following entry into any existing configuration.

```json
{
  "mcpServers": {
    "hig": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/apple-hig-mcp/dist/index.js"]
    }
  }
}
```

Claude Code exposes the same MCP prompts as its own slash commands, namespaced from the server key and prompt name, rather than as `/hig/web`. The tools are callable as `mcp__hig__guide_interface`, `mcp__hig__get_topic`, `mcp__hig__get_design_reference`, `mcp__hig__search_hig`, and `mcp__hig__list_topics`.

### Claude Desktop

Add the `hig` entry under `mcpServers` in `%APPDATA%\Claude\claude_desktop_config.json`. On an MSIX or Store install, the file that actually loads can be `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`. Fully quit Claude after editing.

```json
{
  "mcpServers": {
    "hig": {
      "command": "node",
      "args": ["/absolute/path/to/apple-hig-mcp/dist/index.js"]
    }
  }
}
```

### Codex

Add the following table to `.codex/config.toml` in a trusted application project, or to `~/.codex/config.toml` for your user. On Windows, the user configuration normally lives at `%USERPROFILE%\.codex\config.toml`. Update an existing table rather than duplicating it, then run `codex mcp list`.

```toml
[mcp_servers.hig]
command = "node"
args = ["/absolute/path/to/apple-hig-mcp/dist/index.js"]
startup_timeout_sec = 30
```

Codex lists MCP tools with `/mcp` and does not run MCP prompts. The matching instructions are in [`.codex/prompts/`](.codex/prompts). Codex reads user prompts from `%USERPROFILE%\.codex\prompts`, so copy those files there if `/prompts:hig-web` does not appear. Invoke them as `/prompts:hig-web`, `/prompts:hig-ios`, `/prompts:hig-ipados`, `/prompts:hig-macos`, `/prompts:hig-watchos`, `/prompts:hig-tvos`, `/prompts:hig-visionos`, `/prompts:hig-topic`, `/prompts:hig-convert`, and `/prompts:hig-audit`.

## Refresh the catalog

`npm run sync-catalog` rewrites [`catalog/topics.json`](catalog/topics.json) from Apple's DocC index. It stores titles, paths, and section names only. Platform tags live in [`catalog/platforms.json`](catalog/platforms.json), and search aliases live in [`catalog/aliases.json`](catalog/aliases.json). Re-run the sync when Apple adds or renames topics.

Fetched articles are cached for seven days. A failed refresh serves a validated cached copy when one exists. Each Apple request has a ten-second deadline covering the response body. A cache-write failure still returns fresh content.

Simultaneous requests for the same article share one fetch. Parsed caches carry a format version; older formats are refreshed so parser fixes take effect immediately. An older-format cache cannot be used offline until it has been refreshed.

## Tests

```bash
npm test
```

Set `LIVE_HIG=1` to fetch Buttons and Typography using an isolated empty cache. These tests require working networking and verify that fresh requests occur:

```bash
LIVE_HIG=1 npm test
```

In PowerShell:

```powershell
$env:LIVE_HIG = "1"
npm test
Remove-Item Env:LIVE_HIG
```

CI checks Node.js 20 and 24 on Windows and Linux. See [CONTRIBUTING.md](CONTRIBUTING.md) for development instructions. The built server is committed so repository-based plugin installations have an executable entry point; rebuild it whenever server source changes.

## Attribution and license

This independent project is not affiliated with or endorsed by Apple Inc. Apple publishes the Human Interface Guidelines; fetched articles include their official source URLs. Apple article text is fetched on demand and is not bundled in this repository.

Repository code and community implementation notes are provided under the [MIT License](LICENSE). That license does not grant rights to Apple's guideline content, fonts, logos, or SF Symbols artwork.
