/* Animated sky behind the display, matching the current weather.
 *
 * The weather widget calls Sky.set("rain", isDay) whenever new weather arrives.
 * Types: clear, partly, cloudy, fog, rain, snow, storm.
 *
 * Preview any sky on your laptop by adding it to the address, e.g.
 *   http://localhost:5050/?sky=snow&day=0
 *
 * Everything moves with CSS transforms and opacity only (no blur), which the
 * Pi's graphics chip handles without loading the CPU.
 */
(function () {
  const el = document.getElementById("sky");
  if (!el) return;

  const params = new URLSearchParams(location.search);
  const preview = params.get("sky");
  let current = "";
  let lightningTimer = null;

  const rand = (min, max) => min + Math.random() * (max - min);

  // Build `count` elements of a class, each with random position/timing
  function particles(cls, count, style) {
    let html = "";
    for (let i = 0; i < count; i++) {
      html += `<i class="${cls}" style="${style(i)}"></i>`;
    }
    return html;
  }

  const stars = () => particles("star", 45, () =>
    `left:${rand(0, 100)}%;top:${rand(0, 70)}%;` +
    `--size:${rand(1, 2.6).toFixed(1)}px;` +
    `animation-delay:-${rand(0, 6).toFixed(1)}s;animation-duration:${rand(3, 7).toFixed(1)}s`);

  const clouds = (n, opacity) => particles("cloud", n, (i) =>
    `top:${rand(-5, 45)}%;--w:${rand(35, 65)}vmin;--o:${opacity};` +
    `animation-duration:${rand(90, 160).toFixed(0)}s;` +
    `animation-delay:-${rand(0, 160).toFixed(0)}s`);

  const rain = (n) => particles("drop", n, () =>
    `left:${rand(-10, 105)}%;` +
    `animation-duration:${rand(0.7, 1.1).toFixed(2)}s;` +
    `animation-delay:-${rand(0, 1.1).toFixed(2)}s;opacity:${rand(0.25, 0.6).toFixed(2)}`);

  const snow = (n) => particles("flake", n, () =>
    `left:${rand(-5, 100)}%;--size:${rand(3, 7).toFixed(1)}px;--sway:${rand(2, 6).toFixed(1)}vmin;` +
    `animation-duration:${rand(9, 16).toFixed(1)}s,${rand(3, 5).toFixed(1)}s;` +
    `animation-delay:-${rand(0, 16).toFixed(1)}s,-${rand(0, 5).toFixed(1)}s`);

  const fog = () => particles("fog", 4, (i) =>
    `top:${15 + i * 20}%;animation-duration:${rand(50, 80).toFixed(0)}s;` +
    `animation-delay:-${rand(0, 80).toFixed(0)}s`);

  const sun = '<i class="sun"></i>';

  function build(kind, isDay) {
    switch (kind) {
      case "clear":  return isDay ? sun : stars();
      case "partly": return (isDay ? sun : stars()) + clouds(3, 0.10);
      case "cloudy": return clouds(6, 0.13);
      case "fog":    return clouds(3, 0.08) + fog();
      case "rain":   return clouds(4, 0.12) + rain(45);
      case "snow":   return clouds(3, 0.10) + snow(40);
      case "storm":  return clouds(5, 0.14) + rain(60) + '<i class="flash"></i>';
      default:       return "";
    }
  }

  // Lightning: a quick double flash every 8-20 seconds
  function scheduleLightning() {
    clearTimeout(lightningTimer);
    lightningTimer = setTimeout(() => {
      const flash = el.querySelector(".flash");
      if (!flash) return;
      flash.classList.remove("on");
      void flash.offsetWidth; // restart the animation
      flash.classList.add("on");
      scheduleLightning();
    }, rand(8000, 20000));
  }

  function set(kind, isDay) {
    if (preview) {
      kind = preview;
      isDay = params.get("day") !== "0";
    }
    const key = kind + (isDay ? "-day" : "-night");
    if (key === current) return; // don't restart animations on every refresh
    current = key;

    el.className = `sky-${kind} ${isDay ? "day" : "night"}`;
    el.innerHTML = build(kind, isDay);
    if (kind === "storm") scheduleLightning();
    else clearTimeout(lightningTimer);
  }

  window.Sky = { set };
  if (preview) set(preview, params.get("day") !== "0");
})();
