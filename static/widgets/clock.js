// Clock widget: time and date. Tap to switch 12/24-hour.
// Each digit rolls in when it changes; the colon gently pulses.
Display.register("clock", {
  refreshSeconds: 1,

  render(el, _data, cfg) {
    const now = new Date();
    const hour12 = this.hour12 ?? cfg.clock12Hour;

    const time = now.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: hour12,
    });
    // Split "1:30 p.m." into "1:30" and "p.m." so the suffix can be smaller
    const [hm, ...rest] = time.split(" ");
    const suffix = rest.join(" ");

    const date = now.toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    // Only redraw when something visible changed (once a minute)
    const key = hm + suffix + date;
    if (key === this.lastKey) return;

    // Line up the old and new time from the right so "9:59" -> "10:00"
    // compares minutes with minutes
    const prev = (this.lastHm || "").padStart(hm.length, " ");
    const firstDraw = this.lastHm === undefined;
    const chars = [...hm].map((c, i) => {
      if (c === ":") return '<span class="colon">:</span>';
      const changed = !firstDraw && c !== prev[i];
      return `<span class="digit${changed ? " roll" : ""}">${c}</span>`;
    }).join("");

    el.innerHTML = `
      <div class="clock-time">${chars}${suffix ? `<span class="clock-suffix">${suffix}</span>` : ""}</div>
      <div class="clock-date">${date}</div>
    `;
    this.lastKey = key;
    this.lastHm = hm;
  },

  onTap(el, data, cfg) {
    this.hour12 = !(this.hour12 ?? cfg.clock12Hour);
    this.lastKey = null; // force a redraw in the new format
    this.render(el, data, cfg);
  },
});
