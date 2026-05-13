import { constants } from "node:fs";
import { access, lstat, mkdir, readlink, rename, rm, symlink } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  DASHBOARD_SESSION_NAME,
  LEGACY_DASHBOARD_SESSION_NAME,
  LEGACY_MANAGED_SESSION_PREFIX,
  LEGACY_STATE_DIR_BASENAME,
  LEGACY_STATE_ENV,
  MANAGED_SESSION_PREFIX,
  STATE_DIR_BASENAME,
  STATE_ENV,
} from "./names.js";
import { agentDir, registryPath } from "./paths.js";
import { loadRegistry, saveRegistry } from "./registry.js";
import { realTmuxExec, type TmuxExec } from "./tmux.js";
import type { ManagedSession } from "./types.js";

export interface MigrationSummary {
  stateMoved: boolean;
  registryUpdated: boolean;
  tmuxRenames: Array<{ from: string; to: string; status: TmuxRenameStatus }>;
  warnings: string[];
}

export type TmuxRenameStatus = "renamed" | "missing" | "conflict" | "failed" | "unchanged";

export async function migrateLegacyRuntime(options: {
  env?: NodeJS.ProcessEnv;
  exec?: TmuxExec;
} = {}): Promise<MigrationSummary> {
  const env = options.env ?? process.env;
  const exec = options.exec ?? realTmuxExec;
  const hadNewEnv = Boolean(env[STATE_ENV]);
  const oldDir = legacyStateDir(env);
  const canonicalEnv = canonicalMigrationEnv(env, oldDir);
  const newDir = canonicalEnv[STATE_ENV]!;
  const summary: MigrationSummary = { stateMoved: false, registryUpdated: false, tmuxRenames: [], warnings: [] };

  if (!hadNewEnv) {
    await migrateStateDir({ oldDir, newDir, summary });
  }

  const dashboard = await renameTmuxIfPresent(LEGACY_DASHBOARD_SESSION_NAME, DASHBOARD_SESSION_NAME, exec);
  if (dashboard !== "unchanged") summary.tmuxRenames.push({ from: LEGACY_DASHBOARD_SESSION_NAME, to: DASHBOARD_SESSION_NAME, status: dashboard });

  const path = registryPath(canonicalEnv);
  const registry = await loadRegistry(path);
  let changed = false;
  const sessions: ManagedSession[] = [];

  for (const session of registry.sessions) {
    let next = rewriteWorkspaceCwd(session, oldDir, newDir);
    if (next !== session) changed = true;

    const desiredTmuxSession = renamePrefix(next.tmuxSession, LEGACY_MANAGED_SESSION_PREFIX, MANAGED_SESSION_PREFIX);
    if (desiredTmuxSession !== next.tmuxSession) {
      const status = await renameTmuxIfPresent(next.tmuxSession, desiredTmuxSession, exec);
      summary.tmuxRenames.push({ from: next.tmuxSession, to: desiredTmuxSession, status });
      if (status === "renamed" || status === "missing") {
        next = { ...next, tmuxSession: desiredTmuxSession, updatedAt: Date.now() };
        changed = true;
      } else {
        summary.warnings.push(`kept legacy tmux session ${next.tmuxSession}: ${status} renaming to ${desiredTmuxSession}`);
      }
    }
    sessions.push(next);
  }

  if (changed) {
    await saveRegistry({ ...registry, sessions }, path);
    summary.registryUpdated = true;
  }
  await rm(join(newDir, "return-key"), { recursive: true, force: true });
  return summary;
}

function canonicalMigrationEnv(env: NodeJS.ProcessEnv, oldDir: string): NodeJS.ProcessEnv {
  const newDir = resolve(env[STATE_ENV] ?? (env[LEGACY_STATE_ENV] ? join(dirname(oldDir), STATE_DIR_BASENAME) : join(agentDir(env), STATE_DIR_BASENAME)));
  env[STATE_ENV] = newDir;
  return { ...env, [STATE_ENV]: newDir };
}

function legacyStateDir(env: NodeJS.ProcessEnv): string {
  return resolve(env[LEGACY_STATE_ENV] ?? join(agentDir(env), LEGACY_STATE_DIR_BASENAME));
}

async function migrateStateDir(input: { oldDir: string; newDir: string; summary: MigrationSummary }): Promise<void> {
  const { oldDir, newDir, summary } = input;
  if (oldDir === newDir || !(await exists(oldDir))) return;
  if (await exists(newDir)) {
    if (!(await isSymlinkTo(oldDir, newDir))) summary.warnings.push(`legacy state still exists beside new state: ${oldDir}`);
    return;
  }

  await mkdir(dirname(newDir), { recursive: true });
  await rename(oldDir, newDir);
  summary.stateMoved = true;
  try {
    await symlink(newDir, oldDir, "dir");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      summary.warnings.push(`could not link legacy state path ${oldDir} to ${newDir}: ${errorMessage(error)}`);
    }
  }
}

async function renameTmuxIfPresent(from: string, to: string, exec: TmuxExec): Promise<TmuxRenameStatus> {
  if (from === to) return "unchanged";
  if (!(await tmuxSessionExists(from, exec))) return "missing";
  if (await tmuxSessionExists(to, exec)) return "conflict";
  try {
    await exec.exec("tmux", ["rename-session", "-t", from, to]);
    return "renamed";
  } catch {
    return "failed";
  }
}

async function tmuxSessionExists(name: string, exec: TmuxExec): Promise<boolean> {
  try {
    await exec.exec("tmux", ["has-session", "-t", name]);
    return true;
  } catch {
    return false;
  }
}

function rewriteWorkspaceCwd(session: ManagedSession, oldDir: string, newDir: string): ManagedSession {
  const workspaceCwd = rewritePrefix(session.workspaceCwd, oldDir, newDir);
  return workspaceCwd === session.workspaceCwd ? session : { ...session, workspaceCwd };
}

function renamePrefix(value: string, from: string, to: string): string {
  return value.startsWith(from) ? `${to}${value.slice(from.length)}` : value;
}

function rewritePrefix(value: string | undefined, from: string, to: string): string | undefined {
  if (!value) return value;
  const resolvedValue = resolve(value);
  const resolvedFrom = resolve(from);
  const rel = relative(resolvedFrom, resolvedValue);
  if (rel === "") return to;
  if (rel.startsWith("..") || rel === ".." || rel.startsWith(`..${pathSeparator()}`)) return value;
  return join(to, rel);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isSymlinkTo(path: string, target: string): Promise<boolean> {
  try {
    const info = await lstat(path);
    if (!info.isSymbolicLink()) return false;
    return resolve(dirname(path), await readlink(path)) === resolve(target);
  } catch {
    return false;
  }
}

function pathSeparator(): string {
  return process.platform === "win32" ? "\\" : "/";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
