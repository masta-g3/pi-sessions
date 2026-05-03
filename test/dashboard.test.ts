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
    command: "pi-sessions tui",
    insideTmux: false,
    env: { PI_SESSIONS_DIR: "/tmp/sessions" },
  }, tmux, runner);

  assert.deepEqual(tmux.calls.map((call) => call.args), [
    ["has-session", "-t", DASHBOARD_SESSION],
  ]);
  assert.deepEqual(runner.calls, [{
    command: "tmux",
    args: ["new-session", "-s", DASHBOARD_SESSION, "-c", "/repo", "PI_SESSIONS_DIR='/tmp/sessions' pi-sessions tui"],
  }]);
});

test("openDashboard attaches existing dashboard outside tmux", async () => {
  const tmux = fakeTmux(true);
  const runner = fakeRunner();

  await openDashboard({ cwd: "/repo", command: "pi-sessions tui", insideTmux: false }, tmux, runner);

  assert.deepEqual(runner.calls, [{ command: "tmux", args: ["attach-session", "-t", DASHBOARD_SESSION] }]);
});

test("openDashboard creates detached dashboard then switches inside tmux", async () => {
  const tmux = fakeTmux(false);
  const runner = fakeRunner();

  await openDashboard({
    cwd: "/repo",
    command: "pi-sessions tui",
    insideTmux: true,
    env: { PI_CODING_AGENT_DIR: "/tmp/agent" },
  }, tmux, runner);

  assert.deepEqual(tmux.calls.map((call) => call.args), [
    ["has-session", "-t", DASHBOARD_SESSION],
    ["new-session", "-d", "-s", DASHBOARD_SESSION, "-c", "/repo", "PI_CODING_AGENT_DIR='/tmp/agent' pi-sessions tui"],
    ["switch-client", "-t", DASHBOARD_SESSION],
  ]);
  assert.deepEqual(runner.calls, []);
});

test("openDashboard switches to existing dashboard inside tmux", async () => {
  const tmux = fakeTmux(true);
  const runner = fakeRunner();

  await openDashboard({ cwd: "/repo", command: "pi-sessions tui", insideTmux: true }, tmux, runner);

  assert.deepEqual(tmux.calls.map((call) => call.args), [
    ["has-session", "-t", DASHBOARD_SESSION],
    ["switch-client", "-t", DASHBOARD_SESSION],
  ]);
  assert.deepEqual(runner.calls, []);
});
