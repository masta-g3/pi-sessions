import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, lstat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateLegacyRuntime } from "../src/core/migration.js";
import type { TmuxExec } from "../src/core/tmux.js";
import type { CommandResult } from "../src/core/types.js";

interface Call {
  command: string;
  args: string[];
}

function fakeTmux(initial: string[]): TmuxExec & { sessions: Set<string>; calls: Call[] } {
  const sessions = new Set(initial);
  const calls: Call[] = [];
  return {
    sessions,
    calls,
    async exec(command, args) {
      calls.push({ command, args });
      if (args[0] === "has-session") {
        if (!sessions.has(args[2]!)) throw new Error("missing");
        return ok();
      }
      if (args[0] === "rename-session") {
        const from = args[2]!;
        const to = args[3]!;
        if (!sessions.has(from)) throw new Error("missing");
        if (sessions.has(to)) throw new Error("exists");
        sessions.delete(from);
        sessions.add(to);
        return ok();
      }
      return ok();
    },
  };
}

function ok(): CommandResult {
  return { stdout: "", stderr: "" };
}

test("migrateLegacyRuntime moves default state and rewrites tmux and workspace paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-agent-hub-migration-"));
  const agent = join(root, "agent");
  const oldDir = join(agent, "pi-sessions");
  const newDir = join(agent, "pi-agent-hub");
  await mkdir(join(oldDir, "return-key"), { recursive: true });
  await writeFile(join(oldDir, "return-key", "active.json"), "{}\n", "utf8");
  await writeFile(join(oldDir, "registry.json"), `${JSON.stringify({
    version: 1,
    sessions: [{
      id: "abcdef1234567890",
      title: "api",
      cwd: root,
      workspaceCwd: join(oldDir, "workspaces", "abcdef1234567890"),
      group: "default",
      tmuxSession: "pi-sessions-abcdef123456",
      status: "running",
      createdAt: 1,
      updatedAt: 1,
    }],
  }, null, 2)}\n`, "utf8");
  const tmux = fakeTmux(["pi-sessions-dashboard", "pi-sessions-abcdef123456"]);

  const summary = await migrateLegacyRuntime({ env: { PI_CODING_AGENT_DIR: agent }, exec: tmux });

  assert.equal(summary.stateMoved, true);
  assert.equal(summary.registryUpdated, true);
  assert.equal((await lstat(oldDir)).isSymbolicLink(), true);
  await assert.rejects(readFile(join(newDir, "return-key", "active.json")), /ENOENT/);
  assert.deepEqual([...tmux.sessions].sort(), ["pi-agent-hub", "pi-agent-hub-abcdef123456"]);
  const registry = JSON.parse(await readFile(join(newDir, "registry.json"), "utf8"));
  assert.equal(registry.sessions[0].tmuxSession, "pi-agent-hub-abcdef123456");
  assert.equal(registry.sessions[0].workspaceCwd, join(newDir, "workspaces", "abcdef1234567890"));
});

test("migrateLegacyRuntime uses PI_SESSIONS_DIR as one-time source when new env is unset", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-agent-hub-migration-custom-"));
  const agent = join(root, "agent");
  const oldDir = join(root, "custom-sessions");
  const newDir = join(root, "pi-agent-hub");
  await mkdir(oldDir, { recursive: true });
  await writeFile(join(oldDir, "registry.json"), '{"version":1,"sessions":[]}\n', "utf8");

  const env: NodeJS.ProcessEnv = { PI_CODING_AGENT_DIR: agent, PI_SESSIONS_DIR: oldDir };
  const summary = await migrateLegacyRuntime({ env, exec: fakeTmux([]) });

  assert.equal(summary.stateMoved, true);
  assert.equal(env.PI_AGENT_HUB_DIR, newDir);
  assert.equal((await lstat(oldDir)).isSymbolicLink(), true);
  assert.equal(JSON.parse(await readFile(join(newDir, "registry.json"), "utf8")).version, 1);
});

test("migrateLegacyRuntime is idempotent after state migration", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-agent-hub-migration-idempotent-"));
  const agent = join(root, "agent");
  const oldDir = join(agent, "pi-sessions");
  const newDir = join(agent, "pi-agent-hub");
  await mkdir(oldDir, { recursive: true });
  await writeFile(join(oldDir, "registry.json"), `${JSON.stringify({
    version: 1,
    sessions: [{
      id: "abcdef1234567890",
      title: "api",
      cwd: root,
      group: "default",
      tmuxSession: "pi-sessions-abcdef123456",
      status: "running",
      createdAt: 1,
      updatedAt: 1,
    }],
  })}\n`, "utf8");

  await migrateLegacyRuntime({ env: { PI_CODING_AGENT_DIR: agent }, exec: fakeTmux(["pi-sessions-abcdef123456"]) });
  const firstRegistry = await readFile(join(newDir, "registry.json"), "utf8");
  const second = await migrateLegacyRuntime({ env: { PI_CODING_AGENT_DIR: agent }, exec: fakeTmux(["pi-agent-hub-abcdef123456"]) });

  assert.equal(second.stateMoved, false);
  assert.equal(second.registryUpdated, false);
  assert.equal(await readFile(join(newDir, "registry.json"), "utf8"), firstRegistry);
});

test("migrateLegacyRuntime keeps legacy registry tmux name on live conflict", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-agent-hub-migration-conflict-"));
  const agent = join(root, "agent");
  const state = join(agent, "pi-agent-hub");
  await mkdir(state, { recursive: true });
  await writeFile(join(state, "registry.json"), `${JSON.stringify({
    version: 1,
    sessions: [{
      id: "abcdef1234567890",
      title: "api",
      cwd: root,
      group: "default",
      tmuxSession: "pi-sessions-abcdef123456",
      status: "running",
      createdAt: 1,
      updatedAt: 1,
    }],
  })}\n`, "utf8");
  const tmux = fakeTmux(["pi-sessions-abcdef123456", "pi-agent-hub-abcdef123456"]);

  const summary = await migrateLegacyRuntime({ env: { PI_CODING_AGENT_DIR: agent }, exec: tmux });

  assert.match(summary.warnings.join("\n"), /kept legacy tmux session/);
  const registry = JSON.parse(await readFile(join(state, "registry.json"), "utf8"));
  assert.equal(registry.sessions[0].tmuxSession, "pi-sessions-abcdef123456");
});
