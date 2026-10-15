import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createServer } from "./server.js";

console.error("hig listening on stdio");
void serveStdio(createServer);
