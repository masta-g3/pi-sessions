import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { createDirectMcpClient } from "../src/mcp/direct-client.js";
import { mcpResultToText } from "../src/mcp/adapter.js";

const here = dirname(fileURLToPath(import.meta.url));

test("direct MCP stdio client lists and calls fake tool", async () => {
  const client = await createDirectMcpClient("fake", {
    type: "stdio",
    command: process.execPath,
    args: [join(here, "fake-mcp-server.js")],
  });
  try {
    const tools = await client.listTools();
    assert.equal(tools.some((tool) => tool.name === "echo"), true);
    const result = await client.callTool("echo", {});
    assert.equal(mcpResultToText(result as Parameters<typeof mcpResultToText>[0]), "echo-ok");
  } finally {
    await client.close();
  }
});
