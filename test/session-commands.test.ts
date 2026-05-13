import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveRegistry } from "../src/core/registry.js";
import { forkManagedSession } from "../src/app/session-commands.js";
import type { ManagedSession } from "../src/core/types.js";

function session(overrides: Partial<ManagedSession> = {}): ManagedSession {
  return {
    id: "source-session",
    title: "source",
    cwd: "/tmp/project",
    group: "default",
    tmuxSession: "pi-agent-hub-source",
    status: "waiting",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

test("forkManagedSession does not register a fork when source history is not saved", async () => {
  const oldDir = process.env.PI_AGENT_HUB_DIR;
  const dir = await mkdtemp(join(tmpdir(), "pi-agent-hub-fork-"));
  process.env.PI_AGENT_HUB_DIR = dir;
  try {
    await saveRegistry({ version: 1, sessions: [session({ sessionFile: join(dir, "missing.jsonl") })] });

    await assert.rejects(
      () => forkManagedSession("source-session", { title: "source fork", group: "default" }),
      /history is not saved yet/,
    );

    const registry = JSON.parse(await readFile(join(dir, "registry.json"), "utf8"));
    assert.equal(registry.sessions.length, 1);
    assert.equal(registry.sessions[0].id, "source-session");
  } finally {
    if (oldDir === undefined) delete process.env.PI_AGENT_HUB_DIR;
    else process.env.PI_AGENT_HUB_DIR = oldDir;
  }
});
