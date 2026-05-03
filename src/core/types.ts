export type CenterStatus = "starting" | "running" | "waiting" | "idle" | "error" | "stopped";

export interface CenterSession {
  id: string;
  title: string;
  cwd: string;
  group: string;
  tmuxSession: string;
  status: CenterStatus;
  sessionFile?: string;
  piSessionId?: string;
  acknowledgedAt?: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
  enabledMcpServers?: string[];
}

export interface CenterRegistry {
  version: 1;
  sessions: CenterSession[];
}

export interface Heartbeat {
  centerSessionId: string;
  piSessionFile?: string;
  piSessionId?: string;
  cwd: string;
  state: "starting" | "running" | "waiting" | "error" | "shutdown";
  stateSince: number;
  message?: string;
  updatedAt: number;
}

export interface TmuxState {
  exists: boolean;
  recentActivityMs?: number;
  error?: string;
}

export interface StatusInput {
  session: CenterSession;
  tmux: TmuxState;
  heartbeat?: Heartbeat;
  now: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}
