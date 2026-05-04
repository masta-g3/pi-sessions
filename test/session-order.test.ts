import test from "node:test";
import assert from "node:assert/strict";
import { assignGroupOrder, nextOrderInGroup, orderedSessions } from "../src/core/session-order.js";
import type { ManagedSession } from "../src/core/types.js";

function session(id: string, group = "default", order?: number): ManagedSession {
  return {
    id,
    title: id,
    cwd: `/tmp/${id}`,
    group,
    tmuxSession: `pi-sessions-${id}`,
    status: "idle",
    createdAt: 1,
    updatedAt: 1,
    ...(order === undefined ? {} : { order }),
  };
}

test("orderedSessions preserves registry order for legacy rows and uses persisted order", () => {
  const sessions = [session("work", "work"), session("b"), session("a"), session("ordered", "default", -1)];
  assert.deepEqual(orderedSessions(sessions).map((item) => item.id), ["ordered", "b", "a", "work"]);
});

test("duplicate persisted orders keep registry order", () => {
  const sessions = [session("b", "default", 0), session("a", "default", 0), session("c", "default", 1)];
  assert.deepEqual(orderedSessions(sessions).map((item) => item.id), ["b", "a", "c"]);
});

test("nextOrderInGroup appends after unordered legacy siblings", () => {
  assert.equal(nextOrderInGroup([session("a"), session("b"), session("c", "work", 4)], "default"), 2);
  assert.equal(nextOrderInGroup([session("a", "default", 2), session("b")], "default"), 3);
});

test("assignGroupOrder maps swapped display order back to registry rows", () => {
  const sessions = [session("a"), session("work", "work"), session("b"), session("c")];
  const next = assignGroupOrder(sessions, ["b", "a", "c"], "default");
  assert.deepEqual(next.map((item) => [item.id, item.order]), [["a", 1], ["work", undefined], ["b", 0], ["c", 2]]);
});
