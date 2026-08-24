#!/usr/bin/env bash
set -euo pipefail

if [ -z "${HEARTBEAT_URL:-}" ]; then
  echo "heartbeat.sh: HEARTBEAT_URL not set, skipping" >&2
  exit 0
fi

curl -fsS -m 10 "$HEARTBEAT_URL" >/dev/null
echo "heartbeat sent"
