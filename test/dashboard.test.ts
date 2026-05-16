import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { DASHBOARD_SESSION, openDashboard, type DashboardRunner } from "../src/app/dashboard.js";
import type { TmuxExec } from "../src/core/tmux.js";
import type { CommandResult } from "../src/core/types.js";

interface Call {
  command: string;
  args: string[];
}

function fakeTmux(existing = false): TmuxExec & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async exec(command, args) {
      calls.push({ command, args });
      if (args[0] === "has-session" && !existing) throw new Error("missing");
      return { stdout: "", stderr: "" } satisfies CommandResult;
    },
  };
}

function fakeRunner(): DashboardRunner & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async run(command, args) {
      calls.push({ command, args });
    },
  };
}

test("openDashboard creates and attaches dashboard outside tmux", async () => {
  const tmux = fakeTmux(false);
  const runner = fakeRunner();

  await openDashboard({
    cwd: "/repo",
    command: "pi-agent-hub tui",
    insideTmux: false,
    env: { PI_AGENT_HUB_DIR: "/tmp/sessions" },
  }, tmux, runner);

  assert.deepEqual(tmux.calls.map((call) => call.args[0]), ["has-session", "new-session", "set-option"]);
  assert.deepEqual(tmux.calls[1]?.args, ["new-session", "-d", "-s", DASHBOARD_SESSION, "-c", "/repo", "PI_AGENT_HUB_DIR='/tmp/sessions' pi-agent-hub tui"]);
  assert.deepEqual(runner.calls, [{ command: "tmux", args: ["attach-session", "-t", DASHBOARD_SESSION] }]);
  assert.ok(tmux.calls[2]?.args.includes("status-style"));
  assert.ok(tmux.calls[2]?.args.includes("status-left"));
});

test("openDashboard configures dashboard chrome with Pi theme immediately", async () => {
  const agent = await mkdtemp(join(tmpdir(), "pi-agent-hub-dashboard-"));
  const tmux = fakeTmux(true);
  const runner = fakeRunner();
  await writeFile(join(agent, "settings.json"), JSON.stringify({ theme: "light" }), "utf8");

  await openDashboard({
    cwd: "/repo",
    command: "pi-agent-hub tui",
    insideTmux: false,
    env: { PI_CODING_AGENT_DIR: agent },
  }, tmux, runner);

  const setOption = tmux.calls.find((call) => call.args[0] === "set-option" && call.args.includes("status-style"));
  assert.ok(setOption);
  assert.ok(setOption.args.includes("bg=#dce0e8,fg=#5a8080"));
});

test("openDashboard attaches existing dashboard outside tmux", async () => {
  const tmux = fakeTmux(true);
  const runner = fakeRunner();

  await openDashboard({ cwd: "/repo", command: "pi-agent-hub tui", insideTmux: false }, tmux, runner);

  assert.deepEqual(tmux.calls.map((call) => call.args[0]), ["has-session", "set-option"]);
  assert.deepEqual(runner.calls, [{ command: "tmux", args: ["attach-session", "-t", DASHBOARD_SESSION] }]);
});

test("openDashboard creates detached dashboard then switches inside tmux", async () => {
  const tmux = fakeTmux(false);
  const runner = fakeRunner();

  await openDashboard({
    cwd: "/repo",
    command: "pi-agent-hub tui",
    insideTmux: true,
    env: { PI_CODING_AGENT_DIR: "/tmp/agent" },
  }, tmux, runner);

  assert.deepEqual(tmux.calls.map((call) => call.args[0]), ["has-session", "new-session", "set-option", "switch-client"]);
  assert.deepEqual(tmux.calls[1]?.args, ["new-session", "-d", "-s", DASHBOARD_SESSION, "-c", "/repo", "PI_CODING_AGENT_DIR='/tmp/agent' pi-agent-hub tui"]);
  assert.deepEqual(runner.calls, []);
});

test("openDashboard switches to existing dashboard inside tmux", async () => {
  const tmux = fakeTmux(true);
  const runner = fakeRunner();

  await openDashboard({ cwd: "/repo", command: "pi-agent-hub tui", insideTmux: true }, tmux, runner);

  assert.deepEqual(tmux.calls.map((call) => call.args[0]), ["has-session", "set-option", "switch-client"]);
  assert.deepEqual(runner.calls, []);
});
