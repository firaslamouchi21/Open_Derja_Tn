#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
notify="$script_dir/../monitoring/notify.sh"

: "${RESTORE_TARGET_URL:?RESTORE_TARGET_URL is required (a throwaway Postgres, never DIRECT_URL)}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
: "${R2_ENDPOINT_URL:=https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com}"
: "${MIN_EXPECTED_ROWS:=1}"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
endpoint="$R2_ENDPOINT_URL"

latest_name="$(aws s3 cp "s3://$R2_BUCKET/backups/latest.pointer" - --endpoint-url "$endpoint")"
encrypted_file="$work_dir/$latest_name"
dump_file="${encrypted_file%.gpg}"

aws s3 cp "s3://$R2_BUCKET/backups/$latest_name" "$encrypted_file" --endpoint-url "$endpoint"

gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" --decrypt \
  --output "$dump_file" "$encrypted_file"

pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_TARGET_URL" "$dump_file"
psql "$RESTORE_TARGET_URL" -Atc "ANALYZE;" >/dev/null

row_count="$(psql "$RESTORE_TARGET_URL" -Atc "
  SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables;
")"

echo "restored $latest_name, live row count: $row_count"

if [ "$row_count" -lt "$MIN_EXPECTED_ROWS" ]; then
  "$notify" error "Restore test" "$latest_name restored but row count ($row_count) is below expected minimum ($MIN_EXPECTED_ROWS)"
  exit 1
fi

"$notify" ok "Restore test" "$latest_name restored successfully, $row_count live rows"
