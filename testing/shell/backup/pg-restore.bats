#!/usr/bin/env bats

setup() {
  script="$BATS_TEST_DIRNAME/../../../devops/backup/pg-restore.sh"
}

@test "pg-restore.sh refuses to run without RESTORE_TARGET_URL" {
  unset RESTORE_TARGET_URL BACKUP_ENCRYPTION_KEY R2_BUCKET R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
  run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"RESTORE_TARGET_URL"* ]]
}

@test "pg-restore.sh refuses to run without BACKUP_ENCRYPTION_KEY" {
  unset BACKUP_ENCRYPTION_KEY R2_BUCKET R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
  RESTORE_TARGET_URL="postgres://x" run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"BACKUP_ENCRYPTION_KEY"* ]]
}
