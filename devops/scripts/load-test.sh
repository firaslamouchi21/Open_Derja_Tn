#!/usr/bin/env bash
set -euo pipefail

target_url="${1:?usage: load-test.sh <url> [duration] [concurrency]}"
duration="${2:-30s}"
concurrency="${3:-10}"

if command -v hey >/dev/null 2>&1; then
  exec hey -z "$duration" -c "$concurrency" "$target_url"
fi

echo "load-test.sh: 'hey' not found, falling back to a plain curl loop" >&2

duration_seconds="${duration%s}"
end_at=$(( $(date +%s) + duration_seconds ))

pids=()
worker() {
  while [ "$(date +%s)" -lt "$end_at" ]; do
    if ! curl -fsS -o /dev/null -m 5 "$target_url" 2>/dev/null; then
      echo "F"
    else
      echo "."
    fi
  done
}

for _ in $(seq 1 "$concurrency"); do
  worker &
  pids+=("$!")
done

for pid in "${pids[@]}"; do
  wait "$pid"
done

echo
echo "load-test.sh: done (install 'hey' for real throughput/latency stats)"
