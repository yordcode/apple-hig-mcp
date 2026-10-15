# Setup and usage guide

Apple HIG MCP gives your coding assistant searchable Apple design guidance and original implementation checklists. It supports web, iOS, iPadOS, macOS, watchOS, tvOS, and visionOS. The included catalog contains 172 topics and 34 design reference cards.

Apple created and publishes the Human Interface Guidelines. This community integration is inspired by Apple's work and helps you apply it effectively; it does not claim authorship of Apple's design system or official affiliation with Apple.

## Easy plugin installation

Requires Node.js 20 or newer and Git. The repository includes the built server, so these commands do not require a manual clone, npm install, or build.

In Claude Code, run separately:

```text
/plugin marketplace add yord-dev/apple-hig-mcp
/plugin install hig@hig
```

In your terminal for Codex:

```bash
codex plugin marketplace add yord-dev/apple-hig-mcp
codex plugin add hig@hig
```

Restart or reload your assistant, then continue at **3. Verify** below. Use the manual setup only if your client does not support these plugin commands. Registering both the plugin and a manual MCP entry can duplicate the server.

To refresh a Codex installation later:

```bash
codex plugin marketplace upgrade hig
codex plugin add hig@hig
```

The plugin and marketplace are both named `hig`. This is a repository marketplace, not a claim of acceptance into an official public plugin directory. See the official [Codex marketplace documentation](https://developers.openai.com/plugins/build/plugins) and [Claude Code marketplace documentation](https://code.claude.com/docs/en/plugin-marketplaces).

## 1. Install

Requirements: Git, Node.js 20 or newer, npm, and an assistant supporting local stdio MCP servers. No API key is required by this server; your assistant may have its own account requirements.

```bash
git clone https://github.com/yord-dev/apple-hig-mcp.git
cd apple-hig-mcp
npm ci
npm run build
```

The catalog is already included. Find the absolute path to `dist/index.js` in your clone, such as:

- Windows: `C:/Projects/apple-hig-mcp/dist/index.js`
- macOS: `/Users/yourname/Projects/apple-hig-mcp/dist/index.js`
- Linux: `/home/yourname/projects/apple-hig-mcp/dist/index.js`

Use your real path in the next step.

## 2. Connect your assistant

### Codex

Add this table to `~/.codex/config.toml`, or to `.codex/config.toml` in a trusted application project. On Windows, the user file is normally `%USERPROFILE%\.codex\config.toml`.

```toml
[mcp_servers.hig]
command = "node"
args = ["/absolute/path/to/apple-hig-mcp/dist/index.js"]
startup_timeout_sec = 30
```

Update an existing `mcp_servers.hig` table rather than adding a duplicate. Restart the connection or Codex, then check `codex mcp list` in a terminal.

### Cursor

Create or edit `.cursor/mcp.json` in your application project, or use Cursor's user MCP settings:

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

Merge this entry into any existing `mcpServers` object. Reload the MCP connection and verify that `hig` is enabled.

### Claude Code

Use the same JSON in `.mcp.json` in your application project. Optionally add `"type": "stdio"` to the server entry. Restart Claude Code and approve the server when prompted.

### Claude Desktop

Use the app's developer settings to open its MCP configuration file. Add the same JSON entry, using your absolute path, then fully quit and reopen Claude Desktop.

On Windows, use forward slashes in JSON paths. If the app cannot find Node.js, replace `"command": "node"` with the full path to `node.exe`.

## 3. Verify

Ask your assistant:

> Call hig's list_topics tool with platform web and limit 5. Show the topic titles and official URLs.

Then:

> Fetch the Buttons guideline for iOS, keeping the Best practices section.

Successful article output includes an official Apple source URL and attribution. A missing heading produces an error listing available headings.

Running `npm start` from the clone is also a startup check. It waits for MCP messages on standard input; it does not open a webpage. Press Ctrl+C when finished.

## 4. Use it

The recommended workflow is:

1. Call `guide_interface` with the task and platform.
2. Fetch its recommended articles with `get_topic`.
3. Read relevant cards with `get_design_reference`.
4. Apply the checklist and cite the official Apple URLs.

### Design an interface

> Use hig to design an accessible checkout form for the web. Reuse this project's components, fetch the relevant guidelines first, and explain the main choices with Apple source links.

### Look up a topic

> Search hig for modal presentation, then summarize the relevant guidance for iPadOS. Do not redesign the interface.

### Audit a screen

> Review this settings screen against the macOS guidelines using hig. Preserve its features and content. List concrete fixes for hierarchy, navigation, labels, focus, and accessibility, with sources.

### Read one section

Call `get_topic` with:

```json
{
  "topic": "typography",
  "platform": "ios",
  "section": "Supporting Dynamic Type"
}
```

Use `platform: "all"` or omit it to retain every platform's notes. Exact normalized heading matches take priority over partial matches. For repeated headings, request a more specific parent section.

## 5. Update

```bash
git pull --ff-only
npm ci
npm run build
```

Restart your assistant's MCP connection. To refresh Apple's navigation metadata separately, run `npm run sync-catalog`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `node` not found | Install Node.js, restart the assistant, or configure the full path to Node. |
| `Cannot find module .../dist/index.js` | Run `npm run build` and verify the configured absolute path. |
| No webpage opens | Expected: this is a stdio MCP server, used through your assistant. |
| Tools do not appear | Reload the connection, check the client's MCP logs, and validate JSON or TOML syntax. |
| Article fetch fails | Check internet access to `developer.apple.com` and retry. |
| A cached copy is shown | Refresh failed, so the server returned a validated older article. |
| Old cache fails after updating | The parsed format changed; fetch once online to refresh it. |
| A section is missing | Choose an available heading and check the selected platform. |

The server caches fetched articles in `~/.cache/hig/` for seven days. Catalog lookup and design cards work locally. Article retrieval requires internet access unless a compatible cached copy exists.

See the [README](../README.md) for the tool list, tests, caching details, attribution, and license.
