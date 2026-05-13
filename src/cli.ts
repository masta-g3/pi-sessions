#!/usr/bin/env node
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { configPath, effectiveMcpCatalogPath, effectiveSkillPoolDirs } from "./core/config.js";
import { extensionPath } from "./core/extension-path.js";
import { LEGACY_STATE_ENV, STATE_ENV, CLI_COMMAND } from "./core/names.js";
import { migrateLegacyRuntime, type MigrationSummary } from "./core/migration.js";
import { registryPath, sessionsStateDir } from "./core/paths.js";
import { loadRegistry } from "./core/registry.js";
import { hasTmux, inspectSwitchReturnBinding } from "./core/tmux.js";
import { dashboardEnv, openDashboard } from "./app/dashboard.js";
import { runTui } from "./app/run-tui.js";
import { deleteManagedSession } from "./app/delete-session.js";
import { addManagedSession, forkManagedSession, restartManagedSession, startManagedSession, stopManagedSession } from "./app/session-commands.js";
import { startMcpPool } from "./mcp/pool-daemon.js";

const command = process.argv[2] ?? "dashboard";
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case "dashboard":
      await dashboard();
      return;
    case "tui":
      await prepareRuntime();
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
    case "delete":
      await deleteCommand(args[0]);
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
  console.log(`${CLI_COMMAND}

Usage:
  ${CLI_COMMAND}              open dashboard tmux session
  ${CLI_COMMAND} tui          run TUI directly
  ${CLI_COMMAND} list
  ${CLI_COMMAND} add <cwd> [-t title] [-g group] [--add-cwd path ...]
  ${CLI_COMMAND} start <session-id>
  ${CLI_COMMAND} stop <session-id>
  ${CLI_COMMAND} restart <session-id>
  ${CLI_COMMAND} delete <session-id>
  ${CLI_COMMAND} fork <session-id> [-t title] [-g group]
  ${CLI_COMMAND} mcp-pool
  ${CLI_COMMAND} doctor
`);
}

async function dashboard() {
  if (!(await hasTmux())) throw new Error(`tmux is required for the dashboard session; use \`${CLI_COMMAND} tui\` to run directly`);
  await prepareRuntime();
  await openDashboard({
    cwd: process.cwd(),
    command: `${CLI_COMMAND} tui`,
    insideTmux: Boolean(process.env.TMUX),
    env: dashboardEnv(),
  });
}

async function list() {
  await prepareRuntime();
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
  await prepareRuntime();
  const cwdArg = argv[0];
  if (!cwdArg) throw new Error(`Usage: ${CLI_COMMAND} add <cwd> [-t title] [-g group] [--add-cwd path ...]`);
  const title = flag(argv, "-t") ?? flag(argv, "--title");
  const group = flag(argv, "-g") ?? flag(argv, "--group");
  const additionalCwds = flags(argv, "--add-cwd");
  const record = await addManagedSession({ cwd: cwdArg, title, group, additionalCwds });
  console.log(record.id);
}

async function start(id: string | undefined) {
  await prepareRuntime();
  if (!id) throw new Error(`Usage: ${CLI_COMMAND} start <session-id>`);
  await startManagedSession(id);
}

async function stop(id: string | undefined) {
  await prepareRuntime();
  if (!id) throw new Error(`Usage: ${CLI_COMMAND} stop <session-id>`);
  await stopManagedSession(id);
}

async function restart(id: string | undefined) {
  await prepareRuntime();
  if (!id) throw new Error(`Usage: ${CLI_COMMAND} restart <session-id>`);
  await restartManagedSession(id);
}

async function deleteCommand(id: string | undefined) {
  await prepareRuntime();
  if (!id) throw new Error(`Usage: ${CLI_COMMAND} delete <session-id>`);
  const deleted = await deleteManagedSession(id);
  console.log(`deleted ${deleted.id}\t${deleted.title}`);
}

async function fork(argv: string[]) {
  await prepareRuntime();
  const sourceId = argv[0];
  if (!sourceId) throw new Error(`Usage: ${CLI_COMMAND} fork <session-id> [-t title] [-g group]`);
  const title = flag(argv, "-t") ?? flag(argv, "--title");
  const group = flag(argv, "-g") ?? flag(argv, "--group");
  const record = await forkManagedSession(sourceId, { title, group });
  console.log(record.id);
}

async function mcpPool() {
  await prepareRuntime();
  const pool = await startMcpPool({ socketPath: `${sessionsStateDir()}/pool/pool.sock` });
  console.log(`MCP pool listening at ${pool.socketPath}`);
  await new Promise<void>((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await pool.close();
}

async function doctor() {
  const migration = await prepareRuntime();
  const dir = sessionsStateDir();
  await mkdir(dir, { recursive: true });
  await access(dir, constants.W_OK);
  const ext = extensionPath();
  console.log(`sessions dir: ${dir}`);
  console.log(`registry:   ${registryPath()}`);
  console.log(`config:     ${configPath()}`);
  console.log(`skill dirs: ${(await effectiveSkillPoolDirs()).join(", ")}`);
  console.log(`mcp:        ${await effectiveMcpCatalogPath()}`);
  console.log(`writable:   ok`);
  console.log(`tmux:       ${(await hasTmux()) ? "ok" : "missing"}`);
  const returnKey = await inspectSwitchReturnBinding();
  if (returnKey.active) {
    const state = returnKey.stale ? "stale" : "active";
    console.log(`return key: ${state} ${returnKey.returnKey} ${returnKey.targetSession} -> ${returnKey.controlSession}`);
  }
  console.log(`extension:  ${ext}`);
  if (process.env[LEGACY_STATE_ENV]) console.log(`warning:   ${LEGACY_STATE_ENV} is legacy; use ${STATE_ENV}`);
  for (const warning of migration.warnings) console.log(`warning:   ${warning}`);
}

async function prepareRuntime(): Promise<MigrationSummary> {
  return migrateLegacyRuntime();
}

function flag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function flags(argv: string[], name: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === name && argv[i + 1]) values.push(argv[i + 1]!);
  }
  return values;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
