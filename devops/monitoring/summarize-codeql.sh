#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
notify="$script_dir/notify.sh"

sarif_file="${1:?usage: summarize-codeql.sh <results.sarif>}"

total="$(jq '[.runs[].results[]] | length' "$sarif_file")"
errors="$(jq '[.runs[].results[] | select(.level == "error")] | length' "$sarif_file")"

summary="$total finding(s), $errors error-level"
echo "$summary"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### CodeQL results"
    echo "$summary"
  } >>"$GITHUB_STEP_SUMMARY"
fi

if [ "$errors" -gt 0 ]; then
  "$notify" error "CodeQL" "$summary"
fi
