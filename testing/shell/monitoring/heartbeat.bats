#!/usr/bin/env bats

setup() {
  script="$BATS_TEST_DIRNAME/../../../devops/monitoring/heartbeat.sh"
}

@test "heartbeat.sh skips cleanly when HEARTBEAT_URL is unset" {
  unset HEARTBEAT_URL
  run "$script"
  [ "$status" -eq 0 ]
  [[ "$output" == *"skipping"* ]]
}

@test "heartbeat.sh curls HEARTBEAT_URL when set" {
  fake_bin="$BATS_TEST_TMPDIR/bin"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl called: $*" >>"$BATS_TEST_TMPDIR/curl.log"
exit 0
EOF
  chmod +x "$fake_bin/curl"

  PATH="$fake_bin:$PATH" HEARTBEAT_URL="https://example.invalid/ping" run "$script"

  [ "$status" -eq 0 ]
  [[ "$output" == *"heartbeat sent"* ]]
  grep -q "example.invalid/ping" "$BATS_TEST_TMPDIR/curl.log"
}
