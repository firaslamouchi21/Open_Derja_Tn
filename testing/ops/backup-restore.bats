#!/usr/bin/env bats
# Real integration test: runs pg-backup.sh and pg-restore.sh against a real
# Postgres and a real S3-compatible store (MinIO), both throwaway Docker
# containers. No mocks. Skips cleanly if docker/aws/gpg aren't available.

setup() {
  backup_script="$BATS_TEST_DIRNAME/../../devops/backup/pg-backup.sh"
  restore_script="$BATS_TEST_DIRNAME/../../devops/backup/pg-restore.sh"

  for bin in docker aws gpg pg_dump pg_restore psql; do
    command -v "$bin" >/dev/null 2>&1 || skip "$bin not available"
  done

  suffix="$RANDOM"
  pg_container="opendarja-test-pg-$suffix"
  minio_container="opendarja-test-minio-$suffix"
  pg_port=$((15000 + RANDOM % 1000))
  minio_port=$((19000 + RANDOM % 1000))

  docker run -d --name "$pg_container" \
    -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test \
    -p "$pg_port:5432" postgres:16-alpine >/dev/null

  docker run -d --name "$minio_container" \
    -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
    -p "$minio_port:9000" minio/minio server /data >/dev/null

  export DIRECT_URL="postgres://test:test@localhost:$pg_port/test"
  export RESTORE_TARGET_URL="postgres://test:test@localhost:$pg_port/test"
  export BACKUP_ENCRYPTION_KEY="test-encryption-key"
  export R2_BUCKET="test-backups"
  export R2_ACCOUNT_ID="unused"
  export R2_ACCESS_KEY_ID="minioadmin"
  export R2_SECRET_ACCESS_KEY="minioadmin"
  export R2_ENDPOINT_URL="http://localhost:$minio_port"
  export MIN_EXPECTED_ROWS=2

  for _ in $(seq 1 30); do
    pg_isready -h localhost -p "$pg_port" -U test >/dev/null 2>&1 && break
    sleep 0.5
  done

  for _ in $(seq 1 30); do
    curl -fsS -o /dev/null "http://localhost:$minio_port/minio/health/live" 2>/dev/null && break
    sleep 0.5
  done

  AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
    aws s3 mb "s3://$R2_BUCKET" --endpoint-url "$R2_ENDPOINT_URL" >/dev/null

  psql "$DIRECT_URL" -c "CREATE TABLE widgets (id serial primary key, name text);" >/dev/null
  psql "$DIRECT_URL" -c "INSERT INTO widgets (name) VALUES ('a'), ('b');" >/dev/null
}

teardown() {
  docker rm -f "$pg_container" "$minio_container" >/dev/null 2>&1 || true
}

@test "pg-backup.sh + pg-restore.sh round-trip real data through real R2-compatible storage" {
  run "$backup_script"
  [ "$status" -eq 0 ]
  [[ "$output" == *"backup complete"* ]]

  # prove restore actually restores, not just that the table already existed
  psql "$RESTORE_TARGET_URL" -c "DROP TABLE widgets;" >/dev/null

  run "$restore_script"
  [ "$status" -eq 0 ]
  [[ "$output" == *"restored successfully"* ]]

  row_count="$(psql "$RESTORE_TARGET_URL" -Atc "SELECT count(*) FROM widgets;")"
  [ "$row_count" -eq 2 ]
}
