# pi-agent-hub Development

This page covers local setup, test commands, package checks, and smoke testing.

## Local setup

```bash
git clone https://github.com/masta-g3/pi-agent-hub.git
cd pi-agent-hub
npm install
npm run build
npm link
pi install "$PWD"
pi-hub doctor
pi-hub
```

- `npm link` provides the `pi-hub` and `pi-agent-hub` shell commands.
- `pi install "$PWD"` lets Pi discover the package extension through `package.json#pi.extensions`.
- Re-run `npm run build` after pulling updates.

## Uninstall local setup

```bash
pi remove /path/to/pi-agent-hub
npm unlink -g pi-agent-hub
```

## Tests

```bash
npm test
npm run package:check
```

Do not run these concurrently: both rebuild `dist`.

## Pi package declaration

The package declares its extension in `package.json`:

```json
{
  "pi": {
    "extensions": ["dist/src/extension/index.js"]
  }
}
```

## Package smoke before publishing

```bash
npm run package:check
npm publish --dry-run
```

## Smoke test with temp state

```bash
TMP=$(mktemp -d)
PI_CODING_AGENT_DIR="$TMP/agent" PI_AGENT_HUB_DIR="$TMP/sessions" node dist/cli.js doctor
PI_CODING_AGENT_DIR="$TMP/agent" PI_AGENT_HUB_DIR="$TMP/sessions" node dist/cli.js list
```
