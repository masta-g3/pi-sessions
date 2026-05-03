export interface PiArgsOptions {
  extensionPath: string;
  sessionFile?: string;
  forkFrom?: string;
  initialPrompt?: string;
}

export function buildPiArgs(options: PiArgsOptions): string[] {
  const args: string[] = ["--extension", options.extensionPath];
  if (options.sessionFile && options.forkFrom) throw new Error("Use either sessionFile or forkFrom, not both");
  if (options.sessionFile) args.push("--session", options.sessionFile);
  if (options.forkFrom) args.push("--fork", options.forkFrom);
  if (options.initialPrompt) args.push(options.initialPrompt);
  return args;
}

export function buildPiCommand(options: PiArgsOptions): { command: string; args: string[] } {
  return { command: "pi", args: buildPiArgs(options) };
}
