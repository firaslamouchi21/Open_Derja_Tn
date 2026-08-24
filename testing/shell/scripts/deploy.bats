#!/usr/bin/env bats

setup() {
  script="$BATS_TEST_DIRNAME/../../../devops/scripts/deploy.sh"
}

@test "deploy.sh requires an env-file argument" {
  run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"usage:"* ]]
}

@test "deploy.sh refuses a nonexistent env file" {
  run "$script" /no/such/env/file
  [ "$status" -eq 1 ]
  [[ "$output" == *"env file not found"* ]]
}
