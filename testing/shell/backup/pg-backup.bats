#!/usr/bin/env bats

setup() {
  script="$BATS_TEST_DIRNAME/../../../devops/backup/pg-backup.sh"
}

@test "pg-backup.sh refuses to run without DIRECT_URL" {
  unset DIRECT_URL BACKUP_ENCRYPTION_KEY R2_BUCKET R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
  run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"DIRECT_URL"* ]]
}

@test "pg-backup.sh refuses to run without BACKUP_ENCRYPTION_KEY" {
  unset BACKUP_ENCRYPTION_KEY R2_BUCKET R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
  DIRECT_URL="postgres://x" run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"BACKUP_ENCRYPTION_KEY"* ]]
}

@test "pg-backup.sh refuses to run without any R2 credential" {
  DIRECT_URL="postgres://x" BACKUP_ENCRYPTION_KEY="k" run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"R2_BUCKET"* ]]
}
