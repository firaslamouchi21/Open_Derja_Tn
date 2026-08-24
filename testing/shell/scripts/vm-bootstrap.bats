#!/usr/bin/env bats

setup() {
  script="$BATS_TEST_DIRNAME/../../../devops/scripts/vm-bootstrap.sh"
}

@test "vm-bootstrap.sh requires REPO_URL" {
  unset REPO_URL
  run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"REPO_URL"* ]]
}

@test "vm-bootstrap.sh refuses to run as a non-root user" {
  REPO_URL="git@example.invalid:repo.git" run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"run as root"* ]]
}
