#!/usr/bin/env bats

setup() {
  script="$BATS_TEST_DIRNAME/../../../devops/monitoring/notify.sh"
}

@test "notify.sh requires level, title, and message" {
  run "$script"
  [ "$status" -eq 1 ]
  [[ "$output" == *"usage:"* ]]
}

@test "notify.sh rejects an unknown level" {
  run "$script" bogus "Title" "Message"
  [ "$status" -eq 1 ]
}

@test "notify.sh no-ops cleanly when no webhook env vars are set" {
  unset SLACK_WEBHOOK_URL DISCORD_WEBHOOK_URL POSTHOG_API_KEY
  run "$script" ok "Title" "Message"
  [ "$status" -eq 0 ]
  [[ "$output" == *"[ok] Title: Message"* ]]
}

@test "notify.sh posts to Slack when SLACK_WEBHOOK_URL is set" {
  fake_bin="$BATS_TEST_TMPDIR/bin"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl called: $*" >>"$BATS_TEST_TMPDIR/curl.log"
exit 0
EOF
  chmod +x "$fake_bin/curl"

  PATH="$fake_bin:$PATH" SLACK_WEBHOOK_URL="https://example.invalid/webhook" \
    run "$script" ok "Title" "Message"

  [ "$status" -eq 0 ]
  grep -q "example.invalid" "$BATS_TEST_TMPDIR/curl.log"
}
