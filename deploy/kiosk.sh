#!/usr/bin/env bash
# Opens the display full screen in Chromium once the web server is up.
# Started automatically when the Pi's desktop logs in (setup.sh wires this up).

PORT="$(cd "$(dirname "$0")/.." && .venv/bin/python -c 'import config; print(config.PORT)' 2>/dev/null || echo 5000)"
URL="http://localhost:$PORT"

# Wait for the server (up to ~60s after boot)
for _ in $(seq 1 30); do
  curl -fsS "$URL/api/version" >/dev/null 2>&1 && break
  sleep 2
done

# Package is "chromium" on newer Pi OS, "chromium-browser" on older
BROWSER="$(command -v chromium || command -v chromium-browser)"

exec "$BROWSER" \
  --kiosk "$URL" \
  --incognito \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --touch-events=enabled \
  --check-for-update-interval=31536000
