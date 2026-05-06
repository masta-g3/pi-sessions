import { groupOrder, orderedSessions } from "../core/session-order.js";
import { orderedSessionRows, sessionDepth } from "../core/session-tree.js";
import type { ManagedSession, SessionStatus } from "../core/types.js";

export interface RenderSession {
  id: string;
  title: string;
  cwd: string;
  additionalCwds: string[];
  workspaceCwd?: string;
  repoCount: number;
  group: string;
  status: SessionStatus;
  displayStatus: "running" | "waiting" | "idle" | "error" | "stopped";
  symbol: string;
  selected: boolean;
  error?: string;
  sessionFile?: string;
  enabledMcpServers: string[];
  kind: "main" | "subagent";
  depth: number;
  parentId?: string;
  agentName?: string;
  taskPreview?: string;
  resultSummary?: string;
}

export interface RenderGroup {
  name: string;
  waitingCount: number;
  errorCount: number;
  sessions: RenderSession[];
}

export interface RenderModel {
  width: number;
  empty: boolean;
  noMatches: boolean;
  showPreview: boolean;
  compactFooter: boolean;
  groups: RenderGroup[];
  selected?: RenderSession;
  footer: string;
  filter?: string;
  preview: string;
}

export interface BuildRenderModelInput {
  sessions: ManagedSession[];
  selectedId?: string;
  width: number;
  filter?: string;
  filterEditing?: boolean;
  preview?: string;
}

export function buildRenderModel(input: BuildRenderModelInput): RenderModel {
  const visible = orderedSessionRows(input.sessions, input.filter);
  const selectedId = pickSelectedId(visible, input.selectedId);
  const mapped = visible.map((session) => toRenderSession(session, session.id === selectedId, input.sessions));
  const groupsByName = new Map<string, RenderSession[]>();
  for (const session of mapped) {
    const group = groupsByName.get(session.group) ?? [];
    group.push(session);
    groupsByName.set(session.group, group);
  }

  const groups = [...groupsByName.entries()]
    .sort(([a], [b]) => groupOrder(a, b))
    .map(([name, sessions]) => ({
      name,
      waitingCount: sessions.filter((session) => session.status === "waiting").length,
      errorCount: sessions.filter((session) => session.status === "error").length,
      sessions,
    } satisfies RenderGroup));

  const compactFooter = input.width < 80;
  return {
    width: input.width,
    empty: input.sessions.length === 0,
    noMatches: input.sessions.length > 0 && visible.length === 0,
    showPreview: input.width >= 80,
    compactFooter,
    groups,
    selected: mapped.find((session) => session.selected),
    footer: input.filter !== undefined
      ? input.filterEditing
        ? `filter: ${input.filter || ""}  • esc clear • enter done`
        : `filter: ${input.filter || ""}  • esc clear`
      : compactFooter ? "? help • / filter • enter • r rename • g group • d delete • q" : "↑↓/jk move • K/J reorder • enter attach • n new • r rename • f fork • g move • G rename group • R restart • d delete • s skills • m mcp • q",
    filter: input.filter,
    preview: input.preview ?? "",
  };
}

export function retainSelectionAfterRefresh(
  previous: ManagedSession[],
  next: ManagedSession[],
  selectedId: string | undefined,
): string | undefined {
  if (!next.length) return undefined;
  if (selectedId && next.some((session) => session.id === selectedId)) return selectedId;
  const removed = previous.find((session) => session.id === selectedId);
  if (!removed) return next[0]?.id;

  const sameGroup = orderedSessions(next).filter((session) => session.group === removed.group);
  if (!sameGroup.length) return orderedSessions(next)[0]?.id;

  const previousSameGroup = orderedSessions(previous).filter((session) => session.group === removed.group);
  const oldIndex = previousSameGroup.findIndex((session) => session.id === selectedId);
  return sameGroup[Math.min(oldIndex, sameGroup.length - 1)]?.id ?? sameGroup.at(-1)?.id;
}

function pickSelectedId(sessions: ManagedSession[], selectedId: string | undefined): string | undefined {
  if (!sessions.length) return undefined;
  if (selectedId && sessions.some((session) => session.id === selectedId)) return selectedId;
  return sessions[0]?.id;
}

function toRenderSession(session: ManagedSession, selected: boolean, sessions: ManagedSession[]): RenderSession {
  const displayStatus = displayStatusFor(session.status);
  return {
    id: session.id,
    title: session.title,
    cwd: session.cwd,
    additionalCwds: session.additionalCwds ?? [],
    workspaceCwd: session.workspaceCwd,
    repoCount: 1 + (session.additionalCwds?.length ?? 0),
    group: session.group,
    status: session.status,
    displayStatus,
    symbol: symbolFor(displayStatus),
    selected,
    error: session.error,
    sessionFile: session.sessionFile,
    enabledMcpServers: session.enabledMcpServers ?? [],
    kind: session.kind ?? "main",
    depth: sessionDepth(session, sessions),
    parentId: session.parentId,
    agentName: session.agentName,
    taskPreview: session.taskPreview,
    resultSummary: session.resultSummary,
  };
}

function displayStatusFor(status: SessionStatus): RenderSession["displayStatus"] {
  if (status === "starting") return "running";
  return status;
}

function symbolFor(status: RenderSession["displayStatus"]): string {
  switch (status) {
    case "running": return "●";
    case "waiting": return "◐";
    case "idle": return "○";
    case "error": return "×";
    case "stopped": return "-";
  }
}
