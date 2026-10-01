#!/usr/bin/env bash
set -u

PROJECT="/home/hisshe/GermanHanguk"
LOG_DIR="$PROJECT/logs"
LOG_FILE="$LOG_DIR/article-worker.log"
STATUS_FILE="$LOG_DIR/article-worker-status.json"
LOCK_FILE="/tmp/germanhanguk-article-worker.lock"

mkdir -p "$LOG_DIR"
write_status() {
  printf '{"state":"%s","startedAt":%s,"finishedAt":%s,"exitCode":%s}\n' \
    "$1" "$2" "$3" "$4" > "$STATUS_FILE.tmp"
  mv "$STATUS_FILE.tmp" "$STATUS_FILE"
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  now="$(date -Is)"
  printf '%s skipped: worker already running\n' "$now" >> "$LOG_FILE"
  write_status "skipped" "\"$now\"" "\"$now\"" "0"
  exit 0
fi

source "$HOME/.nvm/nvm.sh"
cd "$PROJECT" || exit 1
started="$(date -Is)"
printf '\n%s scheduled worker start\n' "$started" >> "$LOG_FILE"
write_status "running" "\"$started\"" "null" "null"

npx tsx scripts/generate-one-article-draft.ts >> "$LOG_FILE" 2>&1
code=$?
finished="$(date -Is)"
printf '%s scheduled worker end exit=%s\n' "$finished" "$code" >> "$LOG_FILE"

if [ "$code" -eq 0 ]; then
  state="success"
else
  state="failed"
fi
write_status "$state" "\"$started\"" "\"$finished\"" "$code"
exit "$code"
