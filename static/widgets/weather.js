// Weather widget: current conditions + 5-day forecast.
// Data comes from widgets/weather.py via /api/widget/weather.
Display.register("weather", {
  needsData: true,
  refreshSeconds: 300, // server caches for 10 min, so this just picks up new data promptly

  render(el, d) {
    const days = d.forecast
      .map((f, i) => {
        // "2026-09-28" -> local date without a timezone shift
        const [y, m, day] = f.date.split("-").map(Number);
        const label = i === 0
          ? "Today"
          : new Date(y, m - 1, day).toLocaleDateString("en-CA", { weekday: "short" });
        const rain = f.precip ? `<div class="fc-precip">💧${f.precip}%</div>` : `<div class="fc-precip"></div>`;
        return `
          <div class="fc-day">
            <div class="fc-label">${label}</div>
            <div class="fc-icon">${f.icon}</div>
            <div class="fc-temps"><span class="hi">${f.high}°</span> <span class="lo">${f.low}°</span></div>
            ${rain}
          </div>`;
      })
      .join("");

    el.innerHTML = `
      <div class="wx-now">
        <div class="wx-icon">${d.icon}</div>
        <div>
          <div class="wx-temp">${d.temp}${d.temp_unit}</div>
          <div class="wx-desc">${d.description}</div>
        </div>
        <div class="wx-details">
          <div>Feels like ${d.feels_like}°</div>
          <div>Humidity ${d.humidity}%</div>
          <div>Wind ${d.wind} ${d.wind_unit}</div>
          <div class="wx-location">${d.location}</div>
        </div>
      </div>
      <div class="wx-forecast">${days}</div>
    `;
  },
});
