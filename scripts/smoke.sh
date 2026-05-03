#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
PI_CODING_AGENT_DIR="$TMP/agent" PI_CENTER_DIR="$TMP/center" node "$ROOT/dist/cli.js" doctor
PI_CODING_AGENT_DIR="$TMP/agent" PI_CENTER_DIR="$TMP/center" node "$ROOT/dist/cli.js" list
