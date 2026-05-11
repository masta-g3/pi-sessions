import { resolve } from "node:path";
import { readJsonOr, writeJsonAtomic } from "./atomic-json.js";
import { repoHistoryPath } from "./paths.js";

export interface RepoHistoryEntry {
  cwd: string;
  lastUsedAt: number;
  useCount: number;
  favorite?: boolean;
}

export interface RepoHistory {
  version: 1;
  repos: RepoHistoryEntry[];
}

const MAX_REPO_HISTORY = 50;

export async function loadRepoHistory(path = repoHistoryPath()): Promise<RepoHistory> {
  const history = await readJsonOr<RepoHistory>(path, emptyRepoHistory());
  return normalizeHistory(history);
}

export async function recordRepoUsage(cwds: string[], now = Date.now(), path = repoHistoryPath()): Promise<RepoHistory> {
  const history = await loadRepoHistory(path);
  const byCwd = new Map(history.repos.map((entry) => [entry.cwd, entry]));
  for (const cwd of normalizeCwds(cwds)) {
    const existing = byCwd.get(cwd);
    byCwd.set(cwd, {
      cwd,
      lastUsedAt: now,
      useCount: (existing?.useCount ?? 0) + 1,
      ...(existing?.favorite ? { favorite: true } : {}),
    });
  }
  const next = { version: 1 as const, repos: rankEntries([...byCwd.values()]).slice(0, MAX_REPO_HISTORY) };
  await writeJsonAtomic(path, next);
  return next;
}

export function rankedRepoCwds(entries: RepoHistoryEntry[]): string[] {
  return rankEntries(entries).map((entry) => entry.cwd);
}

export function mergeRepoCwds(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cwd of groups.flat()) {
    if (!cwd || seen.has(cwd)) continue;
    seen.add(cwd);
    out.push(cwd);
  }
  return out;
}

function emptyRepoHistory(): RepoHistory {
  return { version: 1, repos: [] };
}

function normalizeHistory(value: RepoHistory): RepoHistory {
  if (!value || value.version !== 1 || !Array.isArray(value.repos)) throw new Error("Invalid repo history");
  const byCwd = new Map<string, RepoHistoryEntry>();
  for (const entry of value.repos) {
    if (!entry || typeof entry.cwd !== "string" || typeof entry.lastUsedAt !== "number" || typeof entry.useCount !== "number") throw new Error("Invalid repo history entry");
    const cwd = resolve(entry.cwd);
    const existing = byCwd.get(cwd);
    const next = {
      cwd,
      lastUsedAt: Math.max(existing?.lastUsedAt ?? 0, entry.lastUsedAt),
      useCount: (existing?.useCount ?? 0) + entry.useCount,
      ...(existing?.favorite || entry.favorite ? { favorite: true } : {}),
    };
    byCwd.set(cwd, next);
  }
  return { version: 1, repos: rankEntries([...byCwd.values()]).slice(0, MAX_REPO_HISTORY) };
}

function normalizeCwds(cwds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of cwds) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const cwd = resolve(trimmed);
    if (seen.has(cwd)) continue;
    seen.add(cwd);
    out.push(cwd);
  }
  return out;
}

function rankEntries(entries: RepoHistoryEntry[]): RepoHistoryEntry[] {
  return entries.slice().sort((a, b) => {
    if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
    if (a.lastUsedAt !== b.lastUsedAt) return b.lastUsedAt - a.lastUsedAt;
    if (a.useCount !== b.useCount) return b.useCount - a.useCount;
    return a.cwd.localeCompare(b.cwd);
  });
}
