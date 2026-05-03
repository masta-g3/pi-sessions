import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const failures = [];

await requireFile("dist/cli.js");
await requireExecutable("dist/cli.js");

for (const extension of pkg.pi?.extensions ?? []) {
  await requireFile(extension);
  if (!isIncludedByFiles(extension, pkg.files ?? [])) {
    failures.push(`${extension} is not included by package.json files`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`package check failed: ${failure}`);
  process.exit(1);
}

async function requireFile(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) failures.push(`${path} is not a file`);
  } catch {
    failures.push(`${path} is missing`);
  }
}

async function requireExecutable(path) {
  try {
    await access(path, constants.X_OK);
  } catch {
    failures.push(`${path} is not executable`);
  }
}

function isIncludedByFiles(path, files) {
  return files.some((entry) => {
    const normalized = entry.replace(/\/$/, "");
    return path === normalized || path.startsWith(`${normalized}/`);
  });
}
