/* Small framework that runs each widget.
 *
 * A widget file (static/widgets/<name>.js) calls:
 *
 *   Display.register("name", {
 *     needsData: true,        // fetch /api/widget/<name> (needs widgets/<name>.py)
 *     refreshSeconds: 600,    // how often to fetch/redraw
 *     render(el, data, cfg) { ... },   // draw into el
 *     onTap(el, data, cfg) { ... },    // optional: runs when the widget is tapped
 *   });
 */
(function () {
  const widgets = {};
  const cfg = window.DISPLAY_CONFIG || {};

  function register(name, def) {
    widgets[name] = Object.assign({ needsData: false, refreshSeconds: 60 }, def);
  }

  async function refresh(name) {
    const def = widgets[name];
    const el = document.getElementById("widget-" + name);
    if (!el) return;

    let data = null;
    if (def.needsData) {
      try {
        const resp = await fetch("/api/widget/" + name, { cache: "no-store" });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        data = await resp.json();
        def.lastData = data;
        el.classList.remove("stale");
      } catch (err) {
        console.warn("Widget " + name + " fetch failed:", err);
        el.classList.add("stale");      // dim it, but keep last good data on screen
        if (!def.lastData) {
          el.innerHTML = '<div class="error">' + name + " unavailable</div>";
          return;
        }
        data = def.lastData;
      }
    }

    try {
      def.render(el, data, cfg);
    } catch (err) {
      console.error("Widget " + name + " render failed:", err);
    }
  }

  // Reload the page after an update is deployed (the Pi restarts the
  // server with a new git commit, so /api/version changes).
  async function checkVersion() {
    try {
      const resp = await fetch("/api/version", { cache: "no-store" });
      const { version } = await resp.json();
      if (version && version !== cfg.version) location.reload();
    } catch (err) {
      // Server is probably mid-restart; try again next time
    }
  }

  // ---------- Screen sleep ----------
  // Between SCREEN_SLEEP times (config.py) the backlight turns off and the
  // page goes black. A tap wakes it for SCREEN_WAKE_SECONDS; that first tap
  // only wakes the screen and doesn't reach the widgets.
  const sleep = { asleep: null, wakeUntil: 0 };

  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  function inSleepHours(now) {
    if (!cfg.screenSleep) return false;
    const [start, end] = cfg.screenSleep.map(toMinutes);
    if (start === end) return false;
    const t = now.getHours() * 60 + now.getMinutes();
    // e.g. 23:00-07:00 wraps past midnight
    return start < end ? t >= start && t < end : t >= start || t < end;
  }

  function setAsleep(asleep) {
    if (sleep.asleep === asleep) return;
    sleep.asleep = asleep;
    document.body.classList.toggle("asleep", asleep);
    fetch("/api/screen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: !asleep }),
    }).catch(() => {});
  }

  function checkSleep() {
    setAsleep(inSleepHours(new Date()) && Date.now() > sleep.wakeUntil);
  }

  // Capture phase: runs before any widget sees the tap
  document.addEventListener("click", (e) => {
    if (!inSleepHours(new Date())) return;
    const wasAsleep = sleep.asleep;
    sleep.wakeUntil = Date.now() + (cfg.screenWakeSeconds || 60) * 1000;
    if (wasAsleep) {
      e.stopPropagation();
      e.preventDefault();
      checkSleep();
    }
  }, true);

  function start() {
    checkSleep();
    setInterval(checkSleep, 15 * 1000);

    Object.keys(widgets).forEach((name) => {
      const def = widgets[name];
      const el = document.getElementById("widget-" + name);
      if (!el) return;

      if (def.onTap) {
        el.addEventListener("click", () => def.onTap(el, def.lastData, cfg));
      }

      refresh(name);
      setInterval(() => refresh(name), def.refreshSeconds * 1000);
    });

    setInterval(checkVersion, 60 * 1000);
  }

  // Block pinch-zoom and long-press menus on the touchscreen
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("gesturestart", (e) => e.preventDefault());

  window.Display = { register, refresh, start, config: cfg };
})();
