import test from "node:test";
import assert from "node:assert/strict";
import { movePickerSelection, renderTwoColumnPicker, togglePickerItem } from "../src/tui/two-column-picker.js";
import { darkTheme, stripAnsi } from "../src/tui/theme.js";

test("picker toggles selected item", () => {
  const state = { title: "Skills", selected: 0, items: [{ name: "a", enabled: false }] };
  assert.equal(togglePickerItem(state).items[0]?.enabled, true);
});

test("picker moves selection with wraparound", () => {
  const state = { title: "Skills", selected: 0, items: [{ name: "a", enabled: false }, { name: "b", enabled: false }] };
  assert.equal(movePickerSelection(state, -1).selected, 1);
});

test("picker renders enabled and available columns", () => {
  const lines = renderTwoColumnPicker({ title: "Skills", selected: 0, items: [{ name: "a", enabled: true }, { name: "b", enabled: false }] }, 80);
  assert.match(lines.join("\n"), /Enabled\s+Available/);
  assert.match(lines.join("\n"), /> ✓ a/);
  assert.match(lines.join("\n"), /b/);
});

test("themed picker keeps narrow terminal width", () => {
  const lines = renderTwoColumnPicker({ title: "Skills", selected: 0, items: [{ name: "long-name".repeat(4), enabled: true }] }, 50, darkTheme);
  for (const line of lines) assert.ok(stripAnsi(line).length <= 50, stripAnsi(line));
});
