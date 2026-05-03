import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function extensionPath(importMetaUrl = import.meta.url): string {
  const here = dirname(fileURLToPath(importMetaUrl));
  const candidates = [
    resolve(here, "..", "extension", "index.js"),
    resolve(here, "extension", "index.js"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? candidates[0]!;
}
