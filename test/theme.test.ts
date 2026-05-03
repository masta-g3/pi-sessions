import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { buildRenderModel } from "../src/tui/render-model.js";
import { renderCenter } from "../src/tui/layout.js";
import { darkTheme, loadCenterTheme, stripAnsi, styleToken, themeFromPiTheme } from "../src/tui/theme.js";
import type { CenterSession } from "../src/core/types.js";

function session(): CenterSession {
  return {
    id: "s1",
    title: "api",
    cwd: "/tmp/api",
    group: "default",
    tmuxSession: "pi-center-s1",
    status: "waiting",
    createdAt: 1,
    updatedAt: 1,
  };
}

test("themeFromPiTheme resolves vars for center tokens", () => {
  const theme = themeFromPiTheme({
    vars: { blue: "#00aaff", gray: 242 },
    colors: { accent: "blue", success: "#00ff00", muted: "gray" },
  });
  assert.equal(theme.accent, "#00aaff");
  assert.equal(theme.success, "#00ff00");
  assert.equal(theme.muted, 242);
  assert.equal(theme.error, darkTheme.error);
});

test("loadCenterTheme reads project settings before global settings", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-center-theme-"));
  const project = join(root, "project");
  const agent = join(root, "agent");
  await mkdir(join(project, ".pi", "themes"), { recursive: true });
  await mkdir(agent, { recursive: true });
  await writeFile(join(project, ".pi", "settings.json"), JSON.stringify({ theme: "project-theme" }), "utf8");
  await writeFile(join(project, ".pi", "themes", "project-theme.json"), JSON.stringify({ colors: { accent: "#123456" } }), "utf8");
  await writeFile(join(agent, "settings.json"), JSON.stringify({ theme: "global-theme" }), "utf8");

  const theme = await loadCenterTheme({ cwd: project, env: { PI_CODING_AGENT_DIR: agent } });
  assert.equal(theme.accent, "#123456");
});

test("loadCenterTheme falls back to dark theme", async () => {
  const theme = await loadCenterTheme({ env: { PI_CODING_AGENT_DIR: "/definitely/missing" } });
  assert.deepEqual(theme, darkTheme);
});

test("styleToken uses ANSI without changing visible text", () => {
  const styled = styleToken({ ...darkTheme, accent: "#010203" }, "accent", "api");
  assert.match(styled, /\u001b\[38;2;1;2;3mapi\u001b\[0m/);
  assert.equal(stripAnsi(styled), "api");
});

test("renderCenter applies theme tokens without changing visible width", () => {
  const lines = renderCenter(buildRenderModel({ sessions: [session()], width: 80 }), { ...darkTheme, accent: "#010203" });
  assert.match(lines.join("\n"), /\u001b\[/);
  for (const line of lines) assert.ok(stripAnsi(line).length <= 80, stripAnsi(line));
});
