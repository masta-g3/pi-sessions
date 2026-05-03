export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface PiToolDefinition {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface McpToolResult {
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}

export function normalizeMcpInputSchema(schema: unknown): Record<string, unknown> {
  if (isObjectSchema(schema)) return schema;
  return { type: "object", properties: {} };
}

export function mcpResultToText(result: McpToolResult): string {
  if (result.isError) throw new Error(textContent(result) || "MCP tool failed");
  return textContent(result);
}

function textContent(result: McpToolResult): string {
  return (result.content ?? [])
    .map((item) => item.type === "text" ? item.text ?? "" : `[unsupported MCP ${item.type} content]`)
    .filter(Boolean)
    .join("\n");
}

function isObjectSchema(schema: unknown): schema is Record<string, unknown> {
  return typeof schema === "object" && schema !== null && (schema as { type?: unknown }).type === "object";
}
