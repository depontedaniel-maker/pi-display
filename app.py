"""Local web server for the display.

Chromium (in kiosk mode) shows the page at http://localhost:5000.
Each widget that needs outside data gets a JSON endpoint at /api/widget/<name>.
"""
import logging
import os
import subprocess
import time
from pathlib import Path

from flask import Flask, abort, jsonify, render_template

import config
import widgets

BASE = Path(__file__).resolve().parent

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
log = logging.getLogger("display")

app = Flask(__name__)


def _current_version():
    """The git commit we're running. The browser reloads itself when this changes."""
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=BASE, text=True, stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        # Not a git checkout (e.g. testing from a zip); use start time instead
        return str(int(time.time()))


VERSION = _current_version()

# widget name -> (time fetched, data)
_cache = {}


@app.route("/")
def index():
    client_config = {
        "version": VERSION,
        "clock12Hour": config.CLOCK_12_HOUR,
        "units": config.UNITS,
        "latitude": config.LATITUDE,
        "longitude": config.LONGITUDE,
    }
    return render_template(
        "index.html",
        widgets=config.WIDGETS,
        version=VERSION,
        client_config=client_config,
    )


@app.route("/api/version")
def version():
    return jsonify(version=VERSION)


@app.route("/api/widget/<name>")
def widget_data(name):
    # Only widgets listed in config can be loaded
    if name not in config.WIDGETS:
        abort(404)
    module = widgets.load(name)
    if module is None:
        abort(404)

    ttl = getattr(module, "CACHE_SECONDS", 60)
    cached = _cache.get(name)
    now = time.time()
    if cached and now - cached[0] < ttl:
        return jsonify(cached[1])

    try:
        data = module.get_data(config)
    except Exception:
        log.exception("Widget %s failed to fetch data", name)
        if cached:
            return jsonify(cached[1])  # keep showing the last good data
        return jsonify(error="unavailable"), 503

    _cache[name] = (now, data)
    return jsonify(data)


if __name__ == "__main__":
    # DISPLAY_DEBUG=1 python app.py  -> auto-reloads while you edit on your laptop
    debug = os.environ.get("DISPLAY_DEBUG") == "1"
    app.run(host="127.0.0.1", port=config.PORT, debug=debug)
