# Apple HIG MCP

Bring Apple's Human Interface Guidelines into your AI coding workflow.

A local [Model Context Protocol](https://modelcontextprotocol.io) server for Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines). Cursor, Claude, and Codex can search the full guideline catalog, fetch an article as Markdown, and read community implementation notes inspired by Apple HIG for native apps and the web.

## Commands

| Commands | What it does |
| --- | --- |
| `list_topics` | List topics by section, component group, or platform. |
| `search_hig` | Search titles and aliases such as `modal`, `nav`, and `form`. |
| `get_topic` | Fetch one article. Accepts a slug, path, or `developer.apple.com` URL. |
| `get_design_reference` | Return community implementation notes inspired by Apple's HIG. |
| `guide_interface` | For a task and platform, return a checklist and the topics to fetch next. |

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

## Prompts

In Cursor, reload MCP servers after pulling this change. Run `/hig/help` to list the commands. Each design command already knows its platform. Put what you want designed in the task field. Claude Code and Codex use the same prompt names through the install paths above.

- `/hig/help` to show help
- `/hig/web` for a website or web app
- `/hig/ios` for iPhone
- `/hig/ipados` for iPad
- `/hig/macos` for Mac
- `/hig/watchos` for Apple Watch
- `/hig/tvos` for Apple TV
- `/hig/visionos` for Apple Vision Pro

`/hig/topic` reads one guideline, such as buttons or sheets, without designing. `/hig/convert` rewrites an existing design so it follows the guidelines. `/hig/audit` checks that design and lists the fixes. Convert and audit take the current interface and a platform.

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
