import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { writeJsonAtomic } from "../src/core/atomic-json.js";
import { createSessionRecord, loadRegistry, normalizeGroup, renameGroup, saveRegistry } from "../src/core/registry.js";

async function tempPath(name: string) {
  const dir = await mkdtemp(join(tmpdir(), "pi-center-"));
  return join(dir, name);
}

test("load missing registry returns empty v1 registry", async () => {
  const path = await tempPath("registry.json");
  assert.deepEqual(await loadRegistry(path), { version: 1, sessions: [] });
});

test("atomic JSON write/read round trip", async () => {
  const path = await tempPath("state.json");
  await writeJsonAtomic(path, { ok: true });
  assert.equal(await readFile(path, "utf8"), "{\n  \"ok\": true\n}\n");
});

test("registry save/load round trip", async () => {
  const path = await tempPath("registry.json");
  const session = createSessionRecord({ cwd: "/tmp/project", title: "api", group: "work", now: 10 });
  await saveRegistry({ version: 1, sessions: [session] }, path);
  assert.deepEqual(await loadRegistry(path), { version: 1, sessions: [session] });
});

test("group rename only affects matching sessions", () => {
  const a = createSessionRecord({ cwd: "/tmp/a", group: "old", now: 1 });
  const b = createSessionRecord({ cwd: "/tmp/b", group: "other", now: 1 });
  const renamed = renameGroup({ version: 1, sessions: [a, b] }, "old", "new");
  assert.equal(renamed.sessions[0]?.group, "new");
  assert.equal(renamed.sessions[1]?.group, "other");
});

test("group names are flat labels", () => {
  assert.throws(() => normalizeGroup("work/api"), /flat labels/);
});
