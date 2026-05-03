#!/usr/bin/env node
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPiArgs } from "./core/pi-process.js";
import { extensionPath } from "./core/extension-path.js";
import { centerDir, registryPath } from "./core/paths.js";
import { createSessionRecord, loadRegistry, saveRegistry } from "./core/registry.js";
import { hasTmux, newSession, sessionExists, killSession } from "./core/tmux.js";
import { runTui } from "./app/run-tui.js";
import { startMcpPool } from "./mcp/pool-daemon.js";

const command = process.argv[2] ?? "tui";
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case "tui":
      await runTui();
      return;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    case "list":
      await list();
      return;
    case "add":
      await add(args);
      return;
    case "start":
      await start(args[0]);
      return;
    case "stop":
      await stop(args[0]);
      return;
    case "restart":
      await restart(args[0]);
      return;
    case "fork":
      await fork(args);
      return;
    case "mcp-pool":
      await mcpPool();
      return;
    case "doctor":
      await doctor();
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function printHelp() {
  console.log(`pi-center

Usage:
  pi-center
  pi-center list
  pi-center add <cwd> [-t title] [-g group]
  pi-center start <session-id>
  pi-center stop <session-id>
  pi-center restart <session-id>
  pi-center fork <session-id> [-t title] [-g group]
  pi-center mcp-pool
  pi-center doctor
`);
}

async function list() {
  const registry = await loadRegistry();
  if (!registry.sessions.length) {
    console.log("No managed Pi sessions.");
    return;
  }
  for (const session of registry.sessions) {
    console.log(`${session.id}\t${session.status}\t${session.group}\t${session.title}\t${session.cwd}`);
  }
}

async function add(argv: string[]) {
  const cwdArg = argv[0];
  if (!cwdArg) throw new Error("Usage: pi-center add <cwd> [-t title] [-g group]");
  const title = flag(argv, "-t") ?? flag(argv, "--title");
  const group = flag(argv, "-g") ?? flag(argv, "--group");
  const record = createSessionRecord({ cwd: resolve(cwdArg), title, group });
  const registry = await loadRegistry();
  registry.sessions.push(record);
  await saveRegistry(registry);
  await start(record.id);
  console.log(record.id);
}

async function start(id: string | undefined) {
  if (!id) throw new Error("Usage: pi-center start <session-id>");
  const registry = await loadRegistry();
  const session = findSession(registry, id);
  if (await sessionExists(session.tmuxSession)) return;
  const piArgs = buildPiArgs({ extensionPath: extensionPath(), sessionFile: session.sessionFile });
  await newSession({
    name: session.tmuxSession,
    cwd: session.cwd,
    command: `pi ${piArgs.map(shellQuote).join(" ")}`,
    env: { PI_CENTER_SESSION_ID: session.id, PI_CENTER_DIR: centerDir() },
  });
}

async function stop(id: string | undefined) {
  if (!id) throw new Error("Usage: pi-center stop <session-id>");
  const registry = await loadRegistry();
  const session = findSession(registry, id);
  if (await sessionExists(session.tmuxSession)) await killSession(session.tmuxSession);
  session.status = "stopped";
  session.updatedAt = Date.now();
  await saveRegistry(registry);
}

async function restart(id: string | undefined) {
  if (!id) throw new Error("Usage: pi-center restart <session-id>");
  await stop(id);
  const registry = await loadRegistry();
  const session = findSession(registry, id);
  session.status = "starting";
  session.updatedAt = Date.now();
  await saveRegistry(registry);
  await start(id);
}

async function fork(argv: string[]) {
  const sourceId = argv[0];
  if (!sourceId) throw new Error("Usage: pi-center fork <session-id> [-t title] [-g group]");
  const registry = await loadRegistry();
  const source = findSession(registry, sourceId);
  if (!source.sessionFile) throw new Error(`Cannot fork ${source.id}: Pi session file is not known yet`);
  const title = flag(argv, "-t") ?? flag(argv, "--title") ?? `${source.title} fork`;
  const group = flag(argv, "-g") ?? flag(argv, "--group") ?? source.group;
  const record = createSessionRecord({ cwd: source.cwd, title, group });
  registry.sessions.push(record);
  await saveRegistry(registry);
  const piArgs = buildPiArgs({ extensionPath: extensionPath(), forkFrom: source.sessionFile });
  await newSession({
    name: record.tmuxSession,
    cwd: record.cwd,
    command: `pi ${piArgs.map(shellQuote).join(" ")}`,
    env: { PI_CENTER_SESSION_ID: record.id, PI_CENTER_DIR: centerDir() },
  });
  console.log(record.id);
}

async function mcpPool() {
  const pool = await startMcpPool({ socketPath: `${centerDir()}/pool/pool.sock` });
  console.log(`MCP pool listening at ${pool.socketPath}`);
  await new Promise<void>((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await pool.close();
}

async function doctor() {
  const dir = centerDir();
  await mkdir(dir, { recursive: true });
  await access(dir, constants.W_OK);
  const ext = extensionPath();
  console.log(`center dir: ${dir}`);
  console.log(`registry:   ${registryPath()}`);
  console.log(`writable:   ok`);
  console.log(`tmux:       ${(await hasTmux()) ? "ok" : "missing"}`);
  console.log(`extension:  ${ext}`);
}

function flag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function findSession(registry: { sessions: Array<{ id: string }> }, id: string | undefined) {
  if (!id) throw new Error("Missing session id");
  const session = registry.sessions.find((item) => item.id === id || item.id.startsWith(id));
  if (!session) throw new Error(`Unknown session: ${id}`);
  return session as (typeof registry.sessions)[number] & { title: string; group: string; tmuxSession: string; cwd: string; sessionFile?: string; status: string; updatedAt: number };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
