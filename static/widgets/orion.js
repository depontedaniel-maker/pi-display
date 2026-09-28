// Orion widget: where Orion is in your sky right now.
//
// Calculated in the browser from LATITUDE/LONGITUDE in config.py. No internet
// or server data needed. Accuracy is better than half a degree.
//
// Small sky map in the top-right corner; tap it for a full-screen view showing
// what you'd see facing Orion's direction, plus a whole-sky map.
// Whole-sky maps are drawn like a star chart held over your head: centre is
// straight up, edge is the horizon, north at the top, east on the LEFT.
(function () {
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;

  // J2000 star positions: [RA hours, Dec degrees, magnitude]
  const STARS = {
    Betelgeuse: [5.9195, 7.4071, 0.5],
    Rigel:      [5.2423, -8.2016, 0.1],
    Bellatrix:  [5.4189, 6.3497, 1.6],
    Saiph:      [5.7959, -9.6696, 2.1],
    Alnitak:    [5.6793, -1.9426, 1.8],
    Alnilam:    [5.6036, -1.2019, 1.7],
    Mintaka:    [5.5334, -0.2991, 2.2],
    Meissa:     [5.5855, 9.9342, 3.4],
  };
  const LINES = [
    ["Meissa", "Betelgeuse"], ["Meissa", "Bellatrix"],
    ["Betelgeuse", "Alnitak"], ["Bellatrix", "Mintaka"],
    ["Mintaka", "Alnilam"], ["Alnilam", "Alnitak"],
    ["Alnitak", "Saiph"], ["Mintaka", "Rigel"],
  ];
  const CENTRE = "Alnilam"; // middle belt star stands in for "Orion"
  // Labelled in the close-up view (the belt stars are too close together to label singly)
  const LABELS = { Betelgeuse: "Betelgeuse", Rigel: "Rigel", Bellatrix: "Bellatrix", Saiph: "Saiph", Alnilam: "Belt" };

  // ---------- Astronomy ----------

  const julian = (date) => date.getTime() / 86400000 + 2440587.5;
  const norm360 = (x) => ((x % 360) + 360) % 360;

  // Nudge J2000 coordinates to today's date (precession, ~0.35° since 2000)
  function precess(raDeg, decDeg, jd) {
    const years = (jd - 2451545) / 365.25;
    const ra = raDeg * D2R, dec = decDeg * D2R;
    const dRaSec = (3.075 + 1.336 * Math.sin(ra) * Math.tan(dec)) * years;
    const dDecArcsec = 20.04 * Math.cos(ra) * years;
    return [raDeg + dRaSec / 240, decDeg + dDecArcsec / 3600];
  }

  // Local sidereal time in degrees (longitude east-positive)
  function lst(jd, lon) {
    return norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + lon);
  }

  // Returns { alt, az } in degrees. Azimuth: 0 = north, 90 = east.
  function altAz(raDeg, decDeg, jd, lat, lon) {
    const H = (lst(jd, lon) - raDeg) * D2R;
    const dec = decDeg * D2R, phi = lat * D2R;
    let alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) * R2D;
    const az = norm360(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) * R2D + 180);
    // Atmospheric refraction lifts objects near the horizon by up to ~0.5°
    if (alt > -1) alt += 1.02 / Math.tan((alt + 10.3 / (alt + 5.11)) * D2R) / 60;
    return { alt, az };
  }

  function starPos(name, jd, lat, lon) {
    const [raH, dec] = STARS[name];
    const [ra, d] = precess(raH * 15, dec, jd);
    return altAz(ra, d, jd, lat, lon);
  }

  // Low-precision sun position (good to ~1°, plenty to tell day from night)
  function sunPos(jd, lat, lon) {
    const n = jd - 2451545;
    const L = 280.46 + 0.9856474 * n;
    const g = (357.528 + 0.9856003 * n) * D2R;
    const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R;
    const eps = (23.439 - 0.0000004 * n) * D2R;
    const ra = norm360(Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * R2D);
    const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) * R2D;
    return altAz(ra, dec, jd, lat, lon);
  }

  // First time in the next 24h when test(date) becomes true, to the minute
  function findNext(now, test) {
    const step = 5 * 60000;
    let prev = now;
    for (let t = now.getTime() + step; t <= now.getTime() + 86400000; t += step) {
      const d = new Date(t);
      if (test(d)) {
        for (let m = prev.getTime() + 60000; m <= t; m += 60000) {
          if (test(new Date(m))) return new Date(m);
        }
        return d;
      }
      prev = d;
    }
    return null;
  }

  function compass(az) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(az / 45) % 8];
  }
  function compassWords(az) {
    const words = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
    return words[Math.round(az / 45) % 8];
  }

  function compute(now, lat, lon) {
    const at = (d) => starPos(CENTRE, julian(d), lat, lon);
    const sunAt = (d) => sunPos(julian(d), lat, lon);
    const jd = julian(now);

    const stars = {};
    for (const name of Object.keys(STARS)) stars[name] = starPos(name, jd, lat, lon);

    const centre = stars[CENTRE];
    const up = centre.alt > 0;
    const sun = sunAt(now);
    const dark = sun.alt < -12; // nautical twilight or darker

    const rise = up ? null : findNext(now, (d) => at(d).alt > 0);
    const set = up ? findNext(now, (d) => at(d).alt <= 0) : null;
    // Next time Orion is at least 10° up with the sky properly dark
    const visible = (dark && centre.alt > 10) ? now
      : findNext(now, (d) => at(d).alt > 10 && sunAt(d).alt < -12);

    return {
      stars, centre, up, sun, dark, rise, set, visible,
      riseAz: rise ? at(rise).az : null,
      setAz: set ? at(set).az : null,
    };
  }

  // ---------- Drawing ----------

  const f = (n) => n.toFixed(1);
  const starClass = (name) =>
    name === "Betelgeuse" ? "orion-star red" : name === "Rigel" ? "orion-star blue" : "orion-star";

  // Whole-sky map: centre = straight up, edge = horizon, N up, E left
  function domeSvg(s, id) {
    const R = 100;
    const project = (alt, az) => {
      const r = ((90 - alt) / 90) * R;
      return [-r * Math.sin(az * D2R), -r * Math.cos(az * D2R)];
    };

    let out = `<svg viewBox="-118 -118 236 236" class="orion-dome">
      <defs><clipPath id="orion-clip-${id}"><circle r="${R}"/></clipPath></defs>
      <circle r="${R}" class="sky-bg${s.dark ? " dark" : ""}"/>
      <circle r="${f((60 / 90) * R)}" class="sky-ring"/>
      <circle r="${f((30 / 90) * R)}" class="sky-ring"/>
      <line x1="${-R}" y1="0" x2="${R}" y2="0" class="sky-ring"/>
      <line x1="0" y1="${-R}" x2="0" y2="${R}" class="sky-ring"/>
      <circle r="${R}" class="sky-horizon"/>
      <text x="0" y="-105" class="sky-dir">N</text>
      <text x="0" y="117" class="sky-dir">S</text>
      <text x="-110" y="5" class="sky-dir">E</text>
      <text x="110" y="5" class="sky-dir">W</text>
      <g clip-path="url(#orion-clip-${id})">`;

    if (s.sun.alt > 0) {
      const [x, y] = project(s.sun.alt, s.sun.az);
      out += `<circle cx="${f(x)}" cy="${f(y)}" r="7" class="sky-sun"/>`;
    }

    if (Object.values(s.stars).some((p) => p.alt > 0)) {
      // Ring around Orion so it stands out at small sizes
      const [cx, cy] = project(s.centre.alt, s.centre.az);
      out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="17" class="orion-ring"/>`;
      for (const [a, b] of LINES) {
        const [x1, y1] = project(s.stars[a].alt, s.stars[a].az);
        const [x2, y2] = project(s.stars[b].alt, s.stars[b].az);
        out += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="orion-line thick"/>`;
      }
      for (const [name, [, , mag]] of Object.entries(STARS)) {
        const p = s.stars[name];
        if (p.alt < 0) continue;
        const [x, y] = project(p.alt, p.az);
        out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(Math.max(1.5, 3.8 - mag))}" class="${starClass(name)}"/>`;
      }
    }
    out += `</g>`;

    // Below the horizon: mark where it will rise
    if (!s.up && s.riseAz !== null) {
      const [x, y] = project(0, s.riseAz);
      out += `<circle cx="${f(x)}" cy="${f(y)}" r="6" class="orion-rise"/>`;
    }
    return out + `</svg>`;
  }

  // Close-up: the view facing Orion's direction (or where it will rise), true scale
  function horizonSvg(s, now, cfg) {
    const W = 300, H = 210, k = 5;          // k = pixels per degree -> 60° x 42° of sky
    const facing = s.up ? s.centre.az : s.riseAz;
    const altBottom = s.up ? Math.max(0, s.centre.alt - 20) : 0;
    const x = (alt, az) => {
      const dAz = ((az - facing + 540) % 360) - 180;
      return W / 2 + dAz * Math.cos(Math.max(alt, 0) * D2R) * k;
    };
    const y = (alt) => H - 22 - (alt - altBottom) * k;
    const groundY = y(0);

    let out = `<svg viewBox="0 0 ${W} ${H}" class="orion-view">
      <defs><clipPath id="orion-view-clip"><rect width="${W}" height="${H - 22}"/></clipPath></defs>
      <rect width="${W}" height="${H}" class="sky-bg${s.dark ? " dark" : ""}"/>`;

    // Altitude lines every 10°
    for (let a = Math.ceil(altBottom / 10) * 10; a <= altBottom + 40; a += 10) {
      if (a === 0) continue;
      out += `<line x1="0" y1="${f(y(a))}" x2="${W}" y2="${f(y(a))}" class="sky-ring"/>
              <text x="4" y="${f(y(a) - 3)}" class="view-tick">${a}°</text>`;
    }

    out += `<g clip-path="url(#orion-view-clip)">`;
    const drawn = Object.values(s.stars).some((p) => p.alt > 0);
    if (drawn) {
      for (const [a, b] of LINES) {
        const p = s.stars[a], q = s.stars[b];
        out += `<line x1="${f(x(p.alt, p.az))}" y1="${f(y(p.alt))}" x2="${f(x(q.alt, q.az))}" y2="${f(y(q.alt))}" class="orion-line"/>`;
      }
      const midX = x(s.centre.alt, s.centre.az);
      for (const [name, [, , mag]] of Object.entries(STARS)) {
        const p = s.stars[name];
        if (p.alt < 0) continue;
        const sx = x(p.alt, p.az), sy = y(p.alt);
        out += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(Math.max(1.4, 4.4 - mag))}" class="${starClass(name)}"/>`;
        if (LABELS[name]) {
          // Put the label on the outside of the figure so labels don't collide
          const left = sx < midX - 1;
          out += `<text x="${f(sx + (left ? -7 : 7))}" y="${f(sy + 3)}" class="orion-label" text-anchor="${left ? "end" : "start"}">${LABELS[name]}</text>`;
        }
      }
    }
    out += `</g>`;

    // Ground, or a note that the horizon is below the frame
    if (groundY < H - 22 + 0.5) {
      out += `<rect x="0" y="${f(groundY)}" width="${W}" height="${f(H - groundY)}" class="view-ground"/>`;
    } else {
      out += `<rect x="0" y="${H - 22}" width="${W}" height="22" class="view-ground"/>
              <text x="${W - 4}" y="${H - 27}" class="view-tick" text-anchor="end">horizon is ${Math.round(altBottom)}° lower ↓</text>`;
    }

    // Compass ticks along the bottom every 15°
    for (let d = -30; d <= 30; d += 15) {
      const az = norm360(Math.round(facing / 15) * 15 + d);
      const tx = x(0, az);
      if (tx < 16 || tx > W - 16) continue;
      const label = az % 45 === 0 ? compass(az) : `${az}°`;
      out += `<text x="${f(tx)}" y="${H - 7}" class="view-dir${az % 45 === 0 ? " main" : ""}">${label}</text>`;
    }

    if (!s.up && s.rise) {
      const rx = x(0, s.riseAz);
      out += `<circle cx="${f(rx)}" cy="${f(groundY)}" r="5" class="orion-rise"/>
              <text x="${f(rx)}" y="${f(groundY - 10)}" class="orion-label" text-anchor="middle">rises here ${fmtTime(s.rise, now, cfg)}</text>`;
    }
    return out + `</svg>`;
  }

  // ---------- Widget ----------

  function fmtTime(d, now, cfg, withDay) {
    const t = d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: cfg.clock12Hour });
    if (!withDay) return t;
    return d.toDateString() === now.toDateString() ? t : `${t} tomorrow`;
  }

  function shortStatus(s, now, cfg) {
    if (s.up) return `${compass(s.centre.az)} · ${Math.round(s.centre.alt)}° up`;
    if (s.rise) return `Rises ${fmtTime(s.rise, now, cfg)}`;
    return "Below horizon";
  }

  function details(s, now, cfg) {
    const lines = [];
    if (s.up) {
      lines.push(`<div class="orion-big">Look ${compassWords(s.centre.az)}, ${Math.round(s.centre.alt)}° up</div>`);
      lines.push(`<div>Altitude ${s.centre.alt.toFixed(1)}° · Azimuth ${s.centre.az.toFixed(1)}°</div>`);
      if (!s.dark) lines.push(`<div class="orion-note">Above the horizon, but the sky is too bright to see it</div>`);
      if (s.set) lines.push(`<div>Sets ${fmtTime(s.set, now, cfg, true)} in the ${compassWords(s.setAz)}</div>`);
    } else {
      lines.push(`<div class="orion-big">Below the horizon</div>`);
      if (s.rise) lines.push(`<div>Rises ${fmtTime(s.rise, now, cfg, true)} in the ${compassWords(s.riseAz)}</div>`);
    }
    if (s.visible && s.visible !== now) {
      lines.push(`<div>Best viewing from ${fmtTime(s.visible, now, cfg, true)}</div>`);
    } else if (!s.visible) {
      lines.push(`<div class="orion-note">Not visible in a dark sky in the next 24 hours</div>`);
    }
    lines.push(`<div class="orion-note">Tap to close</div>`);
    return lines.join("");
  }

  Display.register("orion", {
    refreshSeconds: 60,

    render(el, _data, cfg) {
      if (cfg.latitude == null) {
        el.innerHTML = `<div class="error">Set LATITUDE in config.py</div>`;
        return;
      }
      const now = new Date();
      const s = compute(now, cfg.latitude, cfg.longitude);

      el.classList.toggle("expanded", !!this.expanded);
      el.innerHTML = this.expanded
        ? `<div class="orion-main">${horizonSvg(s, now, cfg)}</div>
           <div class="orion-side">
             ${domeSvg(s, "big")}
             <div class="orion-info"><div class="orion-heading">Orion</div>${details(s, now, cfg)}</div>
           </div>`
        : `${domeSvg(s, "small")}<div class="orion-title">Orion</div><div class="orion-status">${shortStatus(s, now, cfg)}</div>`;
    },

    onTap(el, data, cfg) {
      this.expanded = !this.expanded;
      clearTimeout(this.closeTimer);
      if (this.expanded) {
        // Go back to the normal display after a minute
        this.closeTimer = setTimeout(() => {
          this.expanded = false;
          this.render(el, data, cfg);
        }, 60000);
      }
      this.render(el, data, cfg);
    },
  });

  // Exposed for testing
  window.OrionMath = { compute, starPos, sunPos, julian };
})();
