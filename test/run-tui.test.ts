import test from "node:test";
import assert from "node:assert/strict";
import { buildNewFormContext } from "../src/app/run-tui.js";
import type { ManagedSession } from "../src/core/types.js";

function session(id: string, cwd: string, group: string, additionalCwds?: string[]): ManagedSession {
  return {
    id,
    title: id,
    cwd,
    group,
    ...(additionalCwds?.length ? { additionalCwds } : {}),
    tmuxSession: `pi-sessions-${id}`,
    status: "idle",
    createdAt: 1,
    updatedAt: 1,
  };
}

test("buildNewFormContext defaults to selected session cwd, group, and additional repos", () => {
  const selected = session("api", "/repo/api", "backend", ["/repo/web", "/repo/shared", "/repo/docs"]);
  const context = buildNewFormContext({
    cwd: "/dashboard",
    sessions: [session("docs", "/repo/docs", "docs"), selected],
    selected,
  });

  assert.deepEqual(context, {
    cwd: "/repo/api",
    group: "backend",
    knownCwds: ["/repo/api", "/repo/docs", "/repo/shared", "/repo/web"],
    additionalCwds: ["/repo/web", "/repo/shared", "/repo/docs"],
  });
});

test("buildNewFormContext falls back to dashboard cwd without selection", () => {
  const context = buildNewFormContext({
    cwd: "/dashboard",
    sessions: [session("api", "/repo/api", "backend")],
  });

  assert.deepEqual(context, {
    cwd: "/dashboard",
    group: undefined,
    knownCwds: ["/repo/api"],
  });
});
