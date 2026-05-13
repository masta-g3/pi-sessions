import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { KIND_ENV, LEGACY_KIND_ENV, LEGACY_PARENT_ID_ENV, LEGACY_SESSION_ID_ENV, LEGACY_STATE_ENV, PARENT_ID_ENV, SESSION_ID_ENV, STATE_ENV } from "../core/names.js";
import { sessionsStateDir } from "../core/paths.js";
import { HEARTBEAT_INTERVAL_MS } from "../core/status.js";
import { registerMcpTools } from "../mcp/register-tools.js";
import type { Heartbeat } from "../core/types.js";

type PiContext = {
  cwd: string;
  sessionManager?: {
    getSessionFile?: () => string | undefined;
    getSessionId?: () => string | undefined;
  };
};

const EXTENSION_KEY = Symbol.for("pi-agent-hub.extension.loaded");
type PiAgentHubGlobal = typeof globalThis & { [EXTENSION_KEY]?: true };

export default function piAgentHubExtension(pi: ExtensionAPI) {
  const globalState = globalThis as PiAgentHubGlobal;
  if (globalState[EXTENSION_KEY]) return;
  globalState[EXTENSION_KEY] = true;

  let currentState: Heartbeat["state"] = "starting";
  let stateSince = Date.now();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let mcpCleanup: (() => Promise<void>) | undefined;

  async function heartbeat(state: Heartbeat["state"], ctx: PiContext, message?: string) {
    const id = process.env[SESSION_ID_ENV] ?? process.env[LEGACY_SESSION_ID_ENV];
    if (!id) return;
    if (state !== currentState) {
      currentState = state;
      stateSince = Date.now();
    }
    const file = join(process.env[STATE_ENV] ?? process.env[LEGACY_STATE_ENV] ?? sessionsStateDir(), "heartbeats", `${id}.json`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify({
      managedSessionId: id,
      cwd: ctx.cwd,
      piSessionFile: ctx.sessionManager?.getSessionFile?.(),
      piSessionId: ctx.sessionManager?.getSessionId?.(),
      state,
      stateSince,
      message,
      updatedAt: Date.now(),
      kind: (process.env[KIND_ENV] ?? process.env[LEGACY_KIND_ENV]) as "subagent" | undefined,
      parentId: process.env[PARENT_ID_ENV] ?? process.env[LEGACY_PARENT_ID_ENV],
      agentName: process.env.PI_SUBAGENT_AGENT,
      taskPreview: process.env.PI_SUBAGENT_TASK_PREVIEW,
      resultPath: process.env.PI_SUBAGENT_RESULT_PATH,
    } satisfies Heartbeat, null, 2)}\n`, "utf8");
  }

  pi.on("session_start", async (_event, ctx) => {
    await heartbeat("waiting", ctx as PiContext);
    heartbeatTimer = setInterval(() => void heartbeat(currentState, ctx as PiContext), HEARTBEAT_INTERVAL_MS);
    mcpCleanup = await registerMcpTools(pi, (ctx as PiContext).cwd);
  });

  pi.on("agent_start", async (_event, ctx) => heartbeat("running", ctx as PiContext));
  pi.on("agent_end", async (_event, ctx) => heartbeat("waiting", ctx as PiContext));
  pi.on("session_shutdown", async (_event, ctx) => {
    try {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      await mcpCleanup?.();
      await heartbeat("shutdown", ctx as PiContext);
    } finally {
      delete globalState[EXTENSION_KEY];
    }
  });
}
