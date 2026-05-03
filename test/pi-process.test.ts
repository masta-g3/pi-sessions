import test from "node:test";
import assert from "node:assert/strict";
import { buildPiArgs } from "../src/core/pi-process.js";

test("builds new session args", () => {
  assert.deepEqual(buildPiArgs({ extensionPath: "/ext.js" }), ["--extension", "/ext.js"]);
});

test("builds resume session args", () => {
  assert.deepEqual(buildPiArgs({ extensionPath: "/ext.js", sessionFile: "/s.jsonl" }), ["--extension", "/ext.js", "--session", "/s.jsonl"]);
});

test("builds fork args", () => {
  assert.deepEqual(buildPiArgs({ extensionPath: "/ext.js", forkFrom: "/s.jsonl" }), ["--extension", "/ext.js", "--fork", "/s.jsonl"]);
});

test("rejects resume and fork together", () => {
  assert.throws(() => buildPiArgs({ extensionPath: "/ext.js", sessionFile: "/s.jsonl", forkFrom: "/s.jsonl" }), /either/);
});
