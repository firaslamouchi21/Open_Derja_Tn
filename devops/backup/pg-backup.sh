#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
notify="$script_dir/../monitoring/notify.sh"

: "${DIRECT_URL:?DIRECT_URL is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
: "${R2_ENDPOINT_URL:=https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

dump_file="$work_dir/opendarja-$timestamp.dump"
encrypted_file="$dump_file.gpg"

pg_dump --format=custom --dbname="$DIRECT_URL" --file="$dump_file"

gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
  --symmetric --cipher-algo AES256 \
  --output "$encrypted_file" "$dump_file"

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

aws s3 cp "$encrypted_file" "s3://$R2_BUCKET/backups/$(basename "$encrypted_file")" \
  --endpoint-url "$R2_ENDPOINT_URL"

echo "$(basename "$encrypted_file")" | aws s3 cp - "s3://$R2_BUCKET/backups/latest.pointer" \
  --endpoint-url "$R2_ENDPOINT_URL"

size="$(du -h "$encrypted_file" | cut -f1)"
"$notify" ok "Backup" "$(basename "$encrypted_file") ($size) uploaded to R2"
echo "backup complete: $(basename "$encrypted_file")"
