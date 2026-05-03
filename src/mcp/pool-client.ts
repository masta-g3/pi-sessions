import { createConnection } from "node:net";
import type { PoolRequest, PoolResponse } from "./pool-protocol.js";

export class McpPoolClient {
  constructor(private socketPath: string) {}

  listTools(serverId: string): Promise<unknown> {
    return this.request({ id: crypto.randomUUID(), type: "listTools", serverId });
  }

  callTool(serverId: string, toolName: string, args: unknown): Promise<unknown> {
    return this.request({ id: crypto.randomUUID(), type: "callTool", serverId, toolName, args });
  }

  private request(request: PoolRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const socket = createConnection(this.socketPath);
      let buffer = "";
      socket.setEncoding("utf8");
      socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
      socket.on("data", (chunk) => {
        buffer += chunk;
        const index = buffer.indexOf("\n");
        if (index === -1) return;
        const response = JSON.parse(buffer.slice(0, index)) as PoolResponse;
        socket.end();
        if (response.ok) resolve(response.result);
        else reject(new Error(response.error));
      });
      socket.on("error", reject);
    });
  }
}
