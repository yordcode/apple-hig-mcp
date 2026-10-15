import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { HELP_COMMANDS } from "../src/help.js";

it("serves MCP requests from an unrelated directory and rejects unsafe topics", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const loader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
  const child = spawn(process.execPath, ["--import", loader, path.join(root, "src", "index.ts")], {
    cwd: os.tmpdir(), stdio: ["pipe", "pipe", "pipe"],
  });
  let buffer = "";
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk; });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`MCP timeout: ${stderr}`)), 5000);
      const finish = (error?: Error) => { clearTimeout(timer); error ? reject(error) : resolve(); };
      const send = (message: unknown) => child.stdin.write(`${JSON.stringify(message)}\n`);
      child.on("error", finish);
      child.on("exit", () => finish(new Error(`Server exited: ${stderr}`)));
      child.stdout.on("data", chunk => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          try {
            const message = JSON.parse(line);
            if (message.id === 1) {
              expect(message.error).toBeUndefined();
              send({ jsonrpc: "2.0", method: "notifications/initialized" });
              send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
            } else if (message.id === 2) {
              expect(message.result.tools.map((tool: { name: string }) => tool.name)).toContain("get_topic");
              send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_topic", arguments: { topic: "../../escape" } } });
            } else if (message.id === 3) {
              expect(message.result.isError).toBe(true);
              expect(message.result.content[0].text).toContain("Invalid HIG topic");
              send({ jsonrpc: "2.0", id: 4, method: "prompts/list", params: {} });
            } else if (message.id === 4) {
              expect(message.result.prompts.map((prompt: { name: string }) => prompt.name).sort()).toEqual(
                HELP_COMMANDS.map(command => command.command.slice(1)).sort(),
              );
              send({ jsonrpc: "2.0", id: 5, method: "prompts/get", params: { name: "hig-web", arguments: { task: "design a settings screen" } } });
            } else if (message.id === 5) {
              const text = message.result.messages[0].content.text;
              expect(text).toContain("design a settings screen");
              expect(text).toContain("guide_interface");
              expect(text).toContain('platform "web"');
              finish();
            }
          } catch (error) { finish(error as Error); }
        }
      });
      send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
        protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "regression", version: "1" },
      } });
    });
  } finally { child.kill(); }
}, 10000);
