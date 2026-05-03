import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "fake", version: "1.0.0" });

server.tool("echo", "Echo text", async () => ({
  content: [{ type: "text", text: "echo-ok" }],
}));

await server.connect(new StdioServerTransport());
