import test from "node:test";
import assert from "node:assert/strict";
import { createRepoPicker, moveRepoPickerSelection, renderRepoPicker, selectedRepoCwd } from "../src/tui/repo-picker.js";
import { insertText } from "../src/tui/text-input.js";

test("repo picker renders labels and compact paths", () => {
  const picker = createRepoPicker(["/Users/manager/Code/api", "/Users/manager/Code/web"]);
  const rendered = renderRepoPicker(picker, 80).join("\n");

  assert.match(rendered, /Recent repos/);
  assert.match(rendered, /api/);
  assert.match(rendered, /web/);
  assert.match(rendered, /~\/Code\/api|\/Users\/manager\/Code\/api/);
});

test("repo picker filters by basename and full path", () => {
  let picker = createRepoPicker(["/tmp/api", "/tmp/mobile-client"]);
  picker = { ...picker, filter: insertText(picker.filter, "client") };

  assert.equal(selectedRepoCwd(picker), "/tmp/mobile-client");
});

test("repo picker movement follows visible rows", () => {
  let picker = createRepoPicker(["/tmp/api", "/tmp/web", "/tmp/worker"]);
  picker = { ...picker, filter: insertText(picker.filter, "w") };
  picker = moveRepoPickerSelection(picker, 1);

  assert.equal(selectedRepoCwd(picker), "/tmp/worker");
});

test("repo picker handles no matches", () => {
  let picker = createRepoPicker(["/tmp/api"]);
  picker = { ...picker, filter: insertText(picker.filter, "zzz") };

  assert.equal(selectedRepoCwd(picker), undefined);
  assert.match(renderRepoPicker(picker, 80).join("\n"), /No repos match/);
});
