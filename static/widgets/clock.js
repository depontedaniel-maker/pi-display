// Clock widget: time and date, redrawn every second. Tap to switch 12/24-hour.
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

    el.innerHTML = `
      <div class="clock-time">${hm}${suffix ? `<span class="clock-suffix">${suffix}</span>` : ""}</div>
      <div class="clock-date">${date}</div>
    `;
  },

  onTap(el, data, cfg) {
    this.hour12 = !(this.hour12 ?? cfg.clock12Hour);
    this.render(el, data, cfg);
  },
});
