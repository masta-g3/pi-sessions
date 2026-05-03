import { mkdir, unlink } from "node:fs/promises";
import { createServer, type Server, type Socket } from "node:net";
import { dirname } from "node:path";
import { loadMcpCatalog } from "./config.js";
import { createDirectMcpClient, type DirectMcpClient } from "./direct-client.js";
import type { PoolRequest, PoolResponse } from "./pool-protocol.js";

export interface McpPoolDaemon {
  socketPath: string;
  close(): Promise<void>;
}

export interface StartMcpPoolOptions {
  socketPath: string;
  catalogPath?: string;
  createClient?: typeof createDirectMcpClient;
}

export async function startMcpPool(options: StartMcpPoolOptions): Promise<McpPoolDaemon> {
  const catalog = await loadMcpCatalog(options.catalogPath);
  const createClient = options.createClient ?? createDirectMcpClient;
  const clients = new Map<string, DirectMcpClient>();

  for (const [serverId, config] of Object.entries(catalog.servers)) {
    if (config.type !== "stdio" || !config.pool) continue;
    clients.set(serverId, await createClient(serverId, config));
  }

  await mkdir(dirname(options.socketPath), { recursive: true });
  await unlink(options.socketPath).catch((error: unknown) => {
    if (!isNotFound(error)) throw error;
  });

  const server = createServer((socket) => handleSocket(socket, clients));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    socketPath: options.socketPath,
    async close() {
      await closeServer(server);
      await Promise.all([...clients.values()].map((client) => client.close()));
      await unlink(options.socketPath).catch((error: unknown) => {
        if (!isNotFound(error)) throw error;
      });
    },
  };
}

function handleSocket(socket: Socket, clients: Map<string, DirectMcpClient>): void {
  let buffer = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    buffer += chunk;
    for (;;) {
      const index = buffer.indexOf("\n");
      if (index === -1) break;
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      void handleRequest(line, clients, socket);
    }
  });
}

async function handleRequest(line: string, clients: Map<string, DirectMcpClient>, socket: Socket): Promise<void> {
  let request: PoolRequest;
  try {
    request = JSON.parse(line) as PoolRequest;
    const client = clients.get(request.serverId);
    if (!client) throw new Error(`Pooled MCP server ${request.serverId} is unavailable`);
    const result = request.type === "listTools"
      ? await client.listTools()
      : await client.callTool(request.toolName, request.args);
    writeResponse(socket, { id: request.id, ok: true, result });
  } catch (error) {
    const id = typeof line === "string" ? safeId(line) : "unknown";
    writeResponse(socket, { id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function writeResponse(socket: Socket, response: PoolResponse): void {
  socket.write(`${JSON.stringify(response)}\n`);
}

function safeId(line: string): string {
  try {
    const parsed = JSON.parse(line) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : "unknown";
  } catch {
    return "unknown";
  }
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
