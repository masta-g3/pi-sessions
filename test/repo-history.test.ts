import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { loadRepoHistory, mergeRepoCwds, rankedRepoCwds, recordRepoUsage, type RepoHistory } from "../src/core/repo-history.js";
import { writeJsonAtomic } from "../src/core/atomic-json.js";

async function tempPath(name: string) {
  const dir = await mkdtemp(join(tmpdir(), "pi-sessions-repos-"));
  return join(dir, name);
}

test("load missing repo history returns empty v1 history", async () => {
  const path = await tempPath("repo-history.json");

  assert.deepEqual(await loadRepoHistory(path), { version: 1, repos: [] });
});

test("recordRepoUsage writes normalized deduped paths", async () => {
  const path = await tempPath("repo-history.json");

  await recordRepoUsage(["/tmp/api", "/tmp/api/../api", ""], 10, path);

  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
    version: 1,
    repos: [{ cwd: resolve("/tmp/api"), lastUsedAt: 10, useCount: 1 }],
  });
});

test("recordRepoUsage increments existing entries and preserves favorite", async () => {
  const path = await tempPath("repo-history.json");
  await writeJsonAtomic(path, {
    version: 1,
    repos: [{ cwd: "/tmp/api", lastUsedAt: 5, useCount: 2, favorite: true }],
  } satisfies RepoHistory);

  const history = await recordRepoUsage(["/tmp/api", "/tmp/web"], 20, path);

  assert.deepEqual(history.repos, [
    { cwd: "/tmp/api", lastUsedAt: 20, useCount: 3, favorite: true },
    { cwd: "/tmp/web", lastUsedAt: 20, useCount: 1 },
  ]);
});

test("rankedRepoCwds sorts favorites then recency then count deterministically", () => {
  assert.deepEqual(rankedRepoCwds([
    { cwd: "/tmp/b", lastUsedAt: 10, useCount: 1 },
    { cwd: "/tmp/a", lastUsedAt: 10, useCount: 1 },
    { cwd: "/tmp/fav", lastUsedAt: 1, useCount: 1, favorite: true },
    { cwd: "/tmp/hot", lastUsedAt: 8, useCount: 9 },
  ]), ["/tmp/fav", "/tmp/a", "/tmp/b", "/tmp/hot"]);
});

test("repo history is capped", async () => {
  const path = await tempPath("repo-history.json");
  const history = await recordRepoUsage(Array.from({ length: 60 }, (_, i) => `/tmp/repo-${i}`), 10, path);

  assert.equal(history.repos.length, 50);
});

test("mergeRepoCwds preserves first occurrence", () => {
  assert.deepEqual(mergeRepoCwds(["/tmp/a", "/tmp/b"], ["/tmp/b", "/tmp/c"]), ["/tmp/a", "/tmp/b", "/tmp/c"]);
});
