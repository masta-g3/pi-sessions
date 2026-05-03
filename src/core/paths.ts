import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function agentDir(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"));
}

export function sessionDir(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.PI_CODING_AGENT_SESSION_DIR ?? join(agentDir(env), "sessions"));
}

export function centerDir(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.PI_CENTER_DIR ?? join(agentDir(env), "command-center"));
}

export function registryPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(centerDir(env), "registry.json");
}

export function heartbeatDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(centerDir(env), "heartbeats");
}

export function heartbeatPath(sessionId: string, env: NodeJS.ProcessEnv = process.env): string {
  return join(heartbeatDir(env), `${sessionId}.json`);
}

export function projectCenterDir(cwd: string): string {
  return join(resolve(cwd), ".pi", "command-center");
}

export function projectSkillsStatePath(cwd: string): string {
  return join(projectCenterDir(cwd), "skills.json");
}

export function projectMcpStatePath(cwd: string): string {
  return join(projectCenterDir(cwd), "mcp.json");
}
