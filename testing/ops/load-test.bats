#!/usr/bin/env bats
# Runs devops/scripts/load-test.sh against a real, throwaway HTTP server —
# not mocked. Skips cleanly if the server can't start (e.g. no python3).

setup() {
  script="$BATS_TEST_DIRNAME/../../devops/scripts/load-test.sh"

  if ! command -v python3 >/dev/null 2>&1; then
    skip "python3 not available to run a throwaway test server"
  fi

  port=8973
  python3 -m http.server "$port" --directory "$BATS_TEST_TMPDIR" >/dev/null 2>&1 &
  server_pid=$!

  for _ in $(seq 1 20); do
    curl -fsS -o /dev/null "http://localhost:$port/" 2>/dev/null && break
    sleep 0.2
  done
}

teardown() {
  [ -n "${server_pid:-}" ] && kill "$server_pid" 2>/dev/null || true
}

@test "load-test.sh requires a target URL" {
  run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"usage:"* ]]
}

@test "load-test.sh completes a short run against a real local server" {
  run "$script" "http://localhost:$port/" 2s 3
  [ "$status" -eq 0 ]
}
