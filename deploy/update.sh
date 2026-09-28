#!/usr/bin/env bash
# Pulls new code from GitHub and restarts the display if anything changed.
# Run automatically every 5 minutes by pi-display-update.timer.
#
# Safety net: if the new code doesn't start, it rolls back to the previous
# working version and skips that commit until you push a fix.
set -euo pipefail

cd "$(dirname "$0")/.."
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
PORT="$(.venv/bin/python -c 'import config; print(config.PORT)' 2>/dev/null || echo 5000)"

git fetch --quiet origin "$BRANCH"

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0  # nothing new
fi

if [ -f .bad_commit ] && [ "$(cat .bad_commit)" = "$REMOTE" ]; then
  echo "Skipping $REMOTE: it failed to start last time. Push a fix."
  exit 0
fi

echo "Updating $LOCAL -> $REMOTE"
OLD_REQS="$(git show HEAD:requirements.txt 2>/dev/null || true)"

# The Pi only runs code, it isn't edited, so match GitHub exactly
git reset --hard --quiet "$REMOTE"

if [ "$OLD_REQS" != "$(cat requirements.txt)" ]; then
  echo "requirements.txt changed; installing packages"
  .venv/bin/pip install --quiet -r requirements.txt
fi

restart() {
  sudo /usr/bin/systemctl restart pi-display.service
}

healthy() {
  for _ in $(seq 1 15); do
    sleep 2
    if curl -fsS "http://127.0.0.1:$PORT/api/version" >/dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

restart
if healthy; then
  rm -f .bad_commit
  echo "Update OK"
else
  echo "New code failed to start; rolling back to $LOCAL"
  echo "$REMOTE" > .bad_commit
  git reset --hard --quiet "$LOCAL"
  .venv/bin/pip install --quiet -r requirements.txt || true
  restart
  exit 1
fi
