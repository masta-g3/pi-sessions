import test from "node:test";
import assert from "node:assert/strict";
import piAgentHubExtension from "../src/extension/index.js";

const EXTENSION_KEY = Symbol.for("pi-agent-hub.extension.loaded");

test("piAgentHubExtension registers handlers once per active process", async () => {
  delete (globalThis as Record<symbol, unknown>)[EXTENSION_KEY];
  const events: string[] = [];
  const handlers = new Map<string, (event: unknown, ctx: unknown) => Promise<void>>();
  const pi = {
    on(name: string, handler: (event: unknown, ctx: unknown) => Promise<void>) {
      events.push(name);
      handlers.set(name, handler);
    },
  };

  piAgentHubExtension(pi as unknown as Parameters<typeof piAgentHubExtension>[0]);
  piAgentHubExtension(pi as unknown as Parameters<typeof piAgentHubExtension>[0]);

  assert.deepEqual(events, ["session_start", "agent_start", "agent_end", "session_shutdown"]);

  await handlers.get("session_shutdown")?.({}, { cwd: "/repo" });
  piAgentHubExtension(pi as unknown as Parameters<typeof piAgentHubExtension>[0]);

  assert.deepEqual(events, [
    "session_start", "agent_start", "agent_end", "session_shutdown",
    "session_start", "agent_start", "agent_end", "session_shutdown",
  ]);
  delete (globalThis as Record<symbol, unknown>)[EXTENSION_KEY];
});
