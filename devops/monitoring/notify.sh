#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: notify.sh <ok|warn|error> <title> <message>" >&2
  exit 1
}

[ "$#" -ge 3 ] || usage

level="$1"
title="$2"
message="$3"

case "$level" in
  ok) emoji="✅" ;;
  warn) emoji="⚠️" ;;
  error) emoji="🚨" ;;
  *) usage ;;
esac

if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
  curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"$emoji *$(printf '%s' "$title" | sed 's/"/\\"/g')*\\n$(printf '%s' "$message" | sed 's/"/\\"/g')\"}" \
    "$SLACK_WEBHOOK_URL" >/dev/null || echo "notify.sh: slack delivery failed" >&2
fi

if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
  curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"content\":\"$emoji **$(printf '%s' "$title" | sed 's/"/\\"/g')**\\n$(printf '%s' "$message" | sed 's/"/\\"/g')\"}" \
    "$DISCORD_WEBHOOK_URL" >/dev/null || echo "notify.sh: discord delivery failed" >&2
fi

if [ -n "${POSTHOG_API_KEY:-}" ]; then
  curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"api_key\":\"$POSTHOG_API_KEY\",\"event\":\"infra_notify\",\"properties\":{\"level\":\"$level\",\"title\":\"$title\",\"message\":\"$message\"},\"distinct_id\":\"devops\"}" \
    "${POSTHOG_HOST:-https://app.posthog.com}/capture/" >/dev/null || echo "notify.sh: posthog delivery failed" >&2
fi

echo "[$level] $title: $message"
