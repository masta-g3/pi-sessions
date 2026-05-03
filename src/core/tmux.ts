import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommandResult } from "./types.js";

const execFileAsync = promisify(execFile);

export interface TmuxExec {
  exec(command: string, args: string[]): Promise<CommandResult>;
}

export const realTmuxExec: TmuxExec = {
  async exec(command, args) {
    try {
      const result = await execFileAsync(command, args, { encoding: "utf8" });
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      if (typeof error === "object" && error !== null && "stdout" in error && "stderr" in error) {
        const failed = error as { stdout: string; stderr: string; message: string };
        throw new Error(`${command} ${args.join(" ")} failed: ${failed.stderr || failed.message}`);
      }
      throw error;
    }
  },
};

export async function hasTmux(exec: TmuxExec = realTmuxExec): Promise<boolean> {
  try {
    await exec.exec("tmux", ["-V"]);
    return true;
  } catch {
    return false;
  }
}

export async function sessionExists(name: string, exec: TmuxExec = realTmuxExec): Promise<boolean> {
  try {
    await exec.exec("tmux", ["has-session", "-t", name]);
    return true;
  } catch {
    return false;
  }
}

export async function newSession(options: {
  name: string;
  cwd: string;
  command: string;
  env?: Record<string, string>;
}, exec: TmuxExec = realTmuxExec): Promise<void> {
  const assignments = Object.entries(options.env ?? {}).map(([key, value]) => `${key}=${shellQuote(value)}`);
  const command = [...assignments, options.command].join(" ");
  await exec.exec("tmux", ["new-session", "-d", "-s", options.name, "-c", options.cwd, command]);
}

export async function killSession(name: string, exec: TmuxExec = realTmuxExec): Promise<void> {
  await exec.exec("tmux", ["kill-session", "-t", name]);
}

export async function capturePane(name: string, lines = 160, exec: TmuxExec = realTmuxExec): Promise<string> {
  const result = await exec.exec("tmux", ["capture-pane", "-p", "-t", name, "-S", `-${lines}`]);
  return result.stdout;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
