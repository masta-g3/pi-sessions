export function toPiToolName(serverId: string, toolName: string, used = new Set<string>()): string {
  const base = `mcp_${slug(serverId)}_${slug(toolName)}`.slice(0, 64).replace(/_+$/g, "");
  if (!used.has(base)) return base;
  const hash = shortHash(`${serverId}:${toolName}`);
  const prefix = base.slice(0, Math.max(1, 63 - hash.length));
  return `${prefix}_${hash}`;
}

export function slug(value: string): string {
  const slugged = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slugged || "x";
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}
