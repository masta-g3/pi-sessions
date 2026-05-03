export type PoolRequest =
  | { id: string; type: "listTools"; serverId: string }
  | { id: string; type: "callTool"; serverId: string; toolName: string; args: unknown };

export type PoolResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: string };
