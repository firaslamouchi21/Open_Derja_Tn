#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
notify="$script_dir/notify.sh"

since="${SCAN_LOGS_SINCE:-15m}"
pattern="${SCAN_LOGS_PATTERN:-ERROR|FATAL|Unhandled|panicked}"
services=(backend frontend nlp processing caddy cloudflared)

found_any=0

for service in "${services[@]}"; do
  container="$(docker compose -f "$script_dir/../compose/docker-compose.prod.yml" ps -q "$service" 2>/dev/null || true)"
  [ -n "$container" ] || continue

  hits="$(docker logs --since "$since" "$container" 2>&1 | grep -E "$pattern" || true)"
  [ -n "$hits" ] || continue

  found_any=1
  count="$(printf '%s\n' "$hits" | wc -l | tr -d ' ')"
  "$notify" warn "Log scan: $service" "$count matching line(s) in the last $since"
done

if [ "$found_any" -eq 0 ]; then
  echo "scan-logs: clean"
fi
