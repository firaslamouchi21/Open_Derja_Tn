#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
compose_file="$repo_root/devops/compose/docker-compose.prod.yml"
notify="$repo_root/devops/monitoring/notify.sh"
heartbeat="$repo_root/devops/monitoring/heartbeat.sh"
scan_logs="$repo_root/devops/monitoring/scan-logs.sh"
pg_backup="$repo_root/devops/backup/pg-backup.sh"

env_file="${1:?usage: deploy.sh <env-file>}"
[ -f "$env_file" ] || { echo "deploy.sh: env file not found: $env_file" >&2; exit 1; }

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

deploy_status="failed"

on_exit() {
  if [ "$deploy_status" = "ok" ]; then
    "$notify" ok "Deploy" "Deployed successfully at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    "$heartbeat" || true
  else
    "$notify" error "Deploy" "Deploy failed at $(date -u +%Y-%m-%dT%H:%M:%SZ) — check logs on the VPS"
  fi
}
trap on_exit EXIT

echo "==> backing up before deploy"
if ! "$pg_backup"; then
  "$notify" error "Deploy" "Pre-deploy backup failed — refusing to proceed"
  exit 1
fi

echo "==> pulling latest code"
git -C "$repo_root" fetch origin
git -C "$repo_root" reset --hard origin/main

echo "==> building and starting prod stack"
docker compose --env-file "$env_file" -f "$compose_file" pull --ignore-pull-failures
docker compose --env-file "$env_file" -f "$compose_file" build
docker compose --env-file "$env_file" -f "$compose_file" up -d --wait

echo "==> pruning old images"
docker image prune -af --filter "until=72h"

echo "==> scanning fresh logs"
"$scan_logs" || true

deploy_status="ok"
echo "==> deploy complete"
