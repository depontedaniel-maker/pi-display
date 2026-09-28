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

  function start() {
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
