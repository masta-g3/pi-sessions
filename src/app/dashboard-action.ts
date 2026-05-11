import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { sessionsStateDir } from "../core/paths.js";

export type DashboardAction = { action: "rename"; tmuxSession: string };

export function dashboardActionPath(stateDir = sessionsStateDir()): string {
  return join(stateDir, "return-key", "dashboard-action.json");
}

export async function consumeDashboardAction(path = dashboardActionPath()): Promise<DashboardAction | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  await rm(path, { force: true });

  const action = JSON.parse(raw) as Partial<DashboardAction>;
  if (action.action === "rename" && typeof action.tmuxSession === "string" && action.tmuxSession) return action as DashboardAction;
  return undefined;
}
