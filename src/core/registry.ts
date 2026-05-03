import { randomUUID } from "node:crypto";
import { basename, resolve } from "node:path";
import { readJsonOr, writeJsonAtomic } from "./atomic-json.js";
import { registryPath } from "./paths.js";
import type { CenterRegistry, CenterSession } from "./types.js";

export const emptyRegistry = (): CenterRegistry => ({ version: 1, sessions: [] });

export async function loadRegistry(path = registryPath()): Promise<CenterRegistry> {
  const registry = await readJsonOr<CenterRegistry>(path, emptyRegistry());
  if (registry.version !== 1 || !Array.isArray(registry.sessions)) {
    throw new Error(`Unsupported registry format: ${path}`);
  }
  return registry;
}

export async function saveRegistry(registry: CenterRegistry, path = registryPath()): Promise<void> {
  await writeJsonAtomic(path, registry);
}

export async function updateRegistry(
  mutate: (registry: CenterRegistry) => CenterRegistry | void,
  path = registryPath(),
): Promise<CenterRegistry> {
  const registry = await loadRegistry(path);
  const next = mutate(registry) ?? registry;
  await saveRegistry(next, path);
  return next;
}

export interface NewSessionInput {
  cwd: string;
  title?: string;
  group?: string;
  now?: number;
}

export function createSessionRecord(input: NewSessionInput): CenterSession {
  const now = input.now ?? Date.now();
  const cwd = resolve(input.cwd);
  const id = randomUUID();
  const title = input.title?.trim() || basename(cwd) || "pi-session";
  return {
    id,
    title,
    cwd,
    group: normalizeGroup(input.group),
    tmuxSession: tmuxSessionName(id),
    status: "starting",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeGroup(group: string | undefined): string {
  const value = group?.trim() || "default";
  if (value.includes("/")) throw new Error("Group names are flat labels; '/' is not supported");
  return value;
}

export function tmuxSessionName(id: string): string {
  return `pi-center-${id.slice(0, 12)}`;
}

export function renameGroup(registry: CenterRegistry, from: string, to: string): CenterRegistry {
  const group = normalizeGroup(to);
  return {
    ...registry,
    sessions: registry.sessions.map((session) =>
      session.group === from ? { ...session, group, updatedAt: Date.now() } : session,
    ),
  };
}

export function upsertSession(registry: CenterRegistry, session: CenterSession): CenterRegistry {
  const index = registry.sessions.findIndex((item) => item.id === session.id);
  if (index === -1) return { ...registry, sessions: [...registry.sessions, session] };
  const sessions = registry.sessions.slice();
  sessions[index] = session;
  return { ...registry, sessions };
}
