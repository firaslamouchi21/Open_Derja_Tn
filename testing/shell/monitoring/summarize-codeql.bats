#!/usr/bin/env bats

setup() {
  script="$BATS_TEST_DIRNAME/../../../devops/monitoring/summarize-codeql.sh"
  sarif="$BATS_TEST_TMPDIR/results.sarif"
}

@test "summarize-codeql.sh requires a sarif file argument" {
  run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"usage:"* ]]
}

@test "summarize-codeql.sh counts total and error-level findings" {
  cat >"$sarif" <<'EOF'
{"runs":[{"results":[{"level":"error"},{"level":"warning"},{"level":"note"}]}]}
EOF
  run "$script" "$sarif"
  [ "$status" -eq 0 ]
  [[ "$output" == *"3 finding(s), 1 error-level"* ]]
}

@test "summarize-codeql.sh reports zero findings cleanly" {
  cat >"$sarif" <<'EOF'
{"runs":[{"results":[]}]}
EOF
  run "$script" "$sarif"
  [ "$status" -eq 0 ]
  [[ "$output" == *"0 finding(s), 0 error-level"* ]]
}
