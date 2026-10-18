// Goose widget: a goose that lives on the display and causes trouble.
//
// It wanders, honks, steals forecast cards, pecks the clock, tracks mud and
// naps. Tap it and it honks and runs off.
//
// It visits for about 5 minutes, waddles off, and comes back 45-60 minutes
// later. Its first visit is about a minute after the display starts, so you
// see it after each update.
//
// On December 25 it wears a Santa hat.
//
// Turn it on by adding "goose" to WIDGETS in config.py.
// On your laptop:
//   http://localhost:5050/?goose=steal   one trick on repeat, goose never leaves
//                                        (wander, honk, steal, peck, mud, nap)
//   http://localhost:5050/?goose=fast    30-second visits, 20 seconds away
(function () {
  // ---- Tweak the goose here ----
  const SIZE_VMIN = 15;          // how big the goose is
  const WALK_SPEED = 0.16;       // screen-heights per second
  const RUN_SPEED = 0.6;
  const VISIT_MINUTES = 5;               // how long each visit lasts
  const AWAY_MINUTES = [45, 60];         // gone for a random time in this range
  const FIRST_VISIT_AFTER_MINUTES = 1;   // after the display starts or updates
  const ACTIONS = {              // how often each thing happens (relative)
    wander: 30, idle: 18, honk: 10, steal: 12, peck: 12, mud: 12, nap: 6,
  };

  // ---- Drawing: an original side-view goose, facing right ----
  const GOOSE_SVG = `
    <svg viewBox="0 0 120 100" class="goose-svg">
      <g class="leg leg-back"><path d="M58 70 L56 90 M56 90 L48 92 M56 90 L60 93" /></g>
      <g class="leg leg-front"><path d="M66 70 L68 90 M68 90 L60 92 M68 90 L73 93" /></g>
      <path class="g-body" d="M24 52 L10 44 L18 58 Q22 74 50 76 Q80 77 88 58 Q90 44 76 42 Q50 36 24 52 Z" />
      <path class="g-wing" d="M34 54 Q52 44 72 52 Q66 66 44 66 Q34 64 34 54 Z" />
      <g class="g-head">
        <path class="g-neck" d="M80 50 Q86 32 88 18" />
        <circle class="g-skull" cx="90" cy="15" r="9" />
        <path class="g-beak" d="M97 11 L113 15 L97 20 Z" />
        <circle class="g-eye" cx="92" cy="12" r="1.9" />
        <g class="goose-hat">
          <path class="hat-red" d="M99 8 C99 -3 90 -10 80 -7 C76 -6 73 -3 71 1 C77 -2 81 0 81 8 Z" />
          <circle class="hat-white" cx="71" cy="2" r="3.6" />
          <ellipse class="hat-white" cx="90" cy="8" rx="10.5" ry="3.4" />
        </g>
      </g>
    </svg>`;
  // Kept outside the flipped part so the text never reads backwards
  const EXTRAS = '<div class="goose-bubble">HONK!</div><div class="goose-zzz">z</div>';

  const CSS = `
    #widget-goose { position: fixed; inset: 0; z-index: 40; pointer-events: none; }
    .goose { position: absolute; left: 0; top: 0; width: ${SIZE_VMIN}vmin; height: ${SIZE_VMIN * 0.83}vmin;
             pointer-events: auto; will-change: transform; }
    .goose-flip { width: 100%; height: 100%; transition: transform 0.15s; }
    .goose.left .goose-flip { transform: scaleX(-1); }
    .goose-svg { width: 100%; height: 100%; overflow: visible; }
    .g-body  { fill: #f3f2ec; }
    .g-wing  { fill: #d9d8d0; }
    .g-neck  { fill: none; stroke: #f3f2ec; stroke-width: 12; stroke-linecap: round; }
    .g-skull { fill: #f3f2ec; }
    .g-beak  { fill: #ff9a2e; }
    .g-eye   { fill: #111; }
    .goose-hat { display: none; }
    .goose.santa .goose-hat { display: inline; }
    .hat-red   { fill: #d62828; }
    .hat-white { fill: #fbfbf7; }
    .leg path { fill: none; stroke: #ff9a2e; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
    .leg-back { transform-origin: 58px 70px; }
    .leg-front { transform-origin: 66px 70px; }
    .g-head { transform-origin: 80px 50px; transition: transform 0.12s; }
    .goose.walking .leg-back  { animation: g-step 0.36s ease-in-out infinite alternate; }
    .goose.walking .leg-front { animation: g-step 0.36s ease-in-out infinite alternate-reverse; }
    .goose.running .leg-back, .goose.running .leg-front { animation-duration: 0.16s; }
    .goose.walking .goose-svg { animation: g-waddle 0.36s ease-in-out infinite alternate; }
    .goose.pecking .g-head { transform: rotate(48deg); }
    .goose.looking .g-head { transform: rotate(-10deg); }
    .goose.napping .leg { opacity: 0; }
    .goose.napping .goose-svg { transform: translateY(14%); }
    .goose.napping .g-head { transform: rotate(70deg) translate(-6px, 4px); }
    @keyframes g-step   { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
    @keyframes g-waddle { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }

    .goose-bubble { position: absolute; right: -6%; top: -28%; padding: 0.6vmin 1.4vmin;
      background: #fff; color: #111; font: 800 3.2vmin/1 sans-serif; border-radius: 1.4vmin;
      opacity: 0; transform: scale(0.6); transition: opacity 0.15s, transform 0.15s; white-space: nowrap; }
    .goose.left .goose-bubble { right: auto; left: -6%; }
    .goose.honking .goose-bubble { opacity: 1; transform: scale(1); }
    .goose.honking .goose-svg { animation: g-hop 0.3s ease-out 2; }
    @keyframes g-hop { 50% { transform: translateY(-12%); } }

    .goose-zzz { position: absolute; right: 10%; top: 5%; color: var(--muted, #aaa);
      font: 600 3vmin sans-serif; opacity: 0; }
    .goose.napping .goose-zzz { animation: g-zzz 2.4s ease-in infinite; }
    @keyframes g-zzz { 0% { opacity: 0; transform: translate(0, 0) scale(0.7); }
                       30% { opacity: 1; } 100% { opacity: 0; transform: translate(3vmin, -6vmin) scale(1.3); } }

    .goose-print { position: absolute; width: 1.6vmin; height: 1vmin; border-radius: 50%;
      background: #6b4a2b; opacity: 0.75; animation: g-print-fade 25s linear forwards; }
    @keyframes g-print-fade { 70% { opacity: 0.6; } 100% { opacity: 0; } }

    .clock-time.goose-wobble { animation: g-wobble 0.5s ease-in-out; }
    @keyframes g-wobble { 25% { transform: rotate(-2.5deg); } 75% { transform: rotate(2deg); } }
    .fc-day.goose-stolen { position: relative; z-index: 35; transition: none; }
  `;

  // ---- Helpers ----
  const ABORT = Symbol("abort");
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (weights) => {
    let r = Math.random() * Object.values(weights).reduce((s, w) => s + w, 0);
    for (const [k, w] of Object.entries(weights)) { if ((r -= w) <= 0) return k; }
    return Object.keys(weights)[0];
  };
  const asleep = () => document.body.classList.contains("asleep");

  const forced = new URLSearchParams(location.search).get("goose");
  const fast = forced === "fast";   // quick visits for testing
  const params = new URLSearchParams(location.search);

  // Santa hat on December 25 (add &santa=1 to the address to preview it)
  function dressForTheDay() {
    const d = new Date();
    const christmas = d.getMonth() === 11 && d.getDate() === 25;
    g.el.classList.toggle("santa", christmas || params.get("santa") === "1");
  }
  const MIN = 60000;
  const timing = fast
    ? { first: 3000, visit: 30000, away: () => 20000 }
    : { first: FIRST_VISIT_AFTER_MINUTES * MIN,
        visit: VISIT_MINUTES * MIN,
        away: () => rand(AWAY_MINUTES[0], AWAY_MINUTES[1]) * MIN };

  const g = {
    el: null, layer: null,
    x: 0, y: 0,          // top-left of the goose, in px
    gen: 0,              // bumped when a tap interrupts whatever it's doing
    carried: null,       // forecast card being dragged
  };

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;
  const gw = () => g.el.offsetWidth;
  const gh = () => g.el.offsetHeight;

  function place() {
    g.el.style.transform = `translate(${g.x.toFixed(1)}px, ${g.y.toFixed(1)}px)`;
  }

  function setPose(...classes) {
    g.el.classList.remove("walking", "running", "pecking", "looking", "napping"); // honking times itself out
    g.el.classList.add(...classes);
  }

  function check(gen) { if (gen !== g.gen) throw ABORT; }

  function wait(ms, gen) {
    return new Promise((resolve, reject) => {
      const end = performance.now() + ms;
      const tick = () => {
        if (gen !== g.gen) return reject(ABORT);
        if (performance.now() >= end) return resolve();
        setTimeout(tick, Math.min(100, end - performance.now()));
      };
      tick();
    });
  }

  // Walk so the goose's feet end up at (fx, fy)
  // offscreen: true lets it walk past the edge (arriving and leaving)
  function walkTo(fx, fy, gen, { speed = WALK_SPEED, onStep, offscreen = false } = {}) {
    let tx = fx - gw() / 2, ty = fy - gh();
    if (!offscreen) {
      tx = Math.max(0, Math.min(W() - gw(), tx));
      ty = Math.max(0, Math.min(H() - gh(), ty));
    }
    return new Promise((resolve, reject) => {
      if (speed > WALK_SPEED) setPose("walking", "running"); else setPose("walking");
      let last = performance.now();
      const frame = (now) => {
        if (gen !== g.gen) return reject(ABORT);
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const dx = tx - g.x, dy = ty - g.y;
        const dist = Math.hypot(dx, dy);
        const step = speed * H() * dt;
        if (Math.abs(dx) > 2) g.el.classList.toggle("left", dx < 0);
        if (dist <= step) {
          g.x = tx; g.y = ty; place(); onStep && onStep();
          setPose();
          return resolve();
        }
        g.x += (dx / dist) * step;
        g.y += (dy / dist) * step;
        place();
        onStep && onStep();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  const feet = () => [g.x + gw() / 2, g.y + gh()];
  const randomSpot = () => [rand(gw() / 2, W() - gw() / 2), rand(gh(), H())];

  function honkBubble(ms = 1200) {
    g.el.classList.add("honking");
    setTimeout(() => g.el.classList.remove("honking"), ms);
  }

  // Muddy footprints that fade away
  let lastPrint = 0, printSide = 1;
  function footprint() {
    const now = performance.now();
    if (now - lastPrint < 260) return;
    lastPrint = now;
    printSide *= -1;
    const [fx, fy] = feet();
    const p = document.createElement("div");
    p.className = "goose-print";
    p.style.left = `${fx + printSide * gw() * 0.06}px`;
    p.style.top = `${fy - gh() * 0.04 + printSide * 3}px`;
    g.layer.insertBefore(p, g.el);
    setTimeout(() => p.remove(), 25000);
  }

  function dropCard() {
    const card = g.carried;
    if (!card) return;
    g.carried = null;
    // Let it sit where it was dropped for a bit, then slide home
    setTimeout(() => {
      card.style.transition = "transform 0.9s cubic-bezier(0.3, 1.3, 0.5, 1)";
      card.style.transform = "";
      setTimeout(() => { card.classList.remove("goose-stolen"); card.style.transition = ""; }, 1000);
    }, 3500);
  }

  // ---- The things the goose does ----
  const actions = {
    async wander(gen) {
      await walkTo(...randomSpot(), gen);
      await wait(rand(500, 2000), gen);
    },

    async idle(gen) {
      setPose("looking");
      await wait(rand(1500, 3500), gen);
      setPose("pecking"); await wait(300, gen);   // peck at the ground
      setPose();          await wait(rand(800, 2000), gen);
    },

    async honk(gen) {
      setPose("looking");
      honkBubble();
      await wait(1400, gen);
      setPose();
    },

    async steal(gen) {
      const cards = [...document.querySelectorAll(".fc-day")];
      if (!cards.length) return actions.wander(gen);
      const card = cards[Math.floor(Math.random() * cards.length)];
      const r = card.getBoundingClientRect();
      // Walk up to the card's bottom edge
      await walkTo(r.left + r.width / 2, r.bottom + gh() * 0.1, gen);
      setPose("pecking"); await wait(350, gen);
      // Grab it and drag it somewhere else
      g.carried = card;
      card.classList.add("goose-stolen");
      const [sx, sy] = feet();
      const [dx, dy] = [rand(gw(), W() - gw()), rand(H() * 0.35, H())];
      await walkTo(dx, dy, gen, {
        onStep: () => {
          const [fx, fy] = feet();
          card.style.transform = `translate(${fx - sx}px, ${fy - sy}px) rotate(${(fx - sx) * 0.02}deg)`;
        },
      });
      dropCard();
      honkBubble();
      await wait(1500, gen);
    },

    async peck(gen) {
      const clock = document.querySelector(".clock-time");
      if (!clock) return actions.wander(gen);
      const r = clock.getBoundingClientRect();
      await walkTo(rand(r.left + r.width * 0.2, r.right - r.width * 0.2), r.bottom + gh() * 0.15, gen);
      for (let i = 0; i < 3; i++) {
        setPose("pecking");
        clock.classList.remove("goose-wobble"); void clock.offsetWidth;
        clock.classList.add("goose-wobble");
        await wait(250, gen);
        setPose(); await wait(350, gen);
      }
      honkBubble();
      await wait(1200, gen);
    },

    async mud(gen) {
      const [x, y] = randomSpot();
      await walkTo(x, y, gen, { onStep: footprint });
      await walkTo(...randomSpot(), gen, { onStep: footprint });
      await wait(rand(500, 1500), gen);
    },

    async nap(gen) {
      setPose("napping");
      await wait(rand(15000, 30000), gen);
      setPose();
    },
  };

  // Tap the goose: it honks and runs away
  async function flee() {
    const gen = ++g.gen;   // cancels whatever it was doing
    dropCard();
    setPose();
    honkBubble(900);
    const [fx] = feet();
    const toLeft = fx > W() / 2;
    try {
      await walkTo(toLeft ? rand(0, W() * 0.25) : rand(W() * 0.75, W()), rand(gh(), H()), gen, { speed: RUN_SPEED });
    } catch (e) { if (e !== ABORT) throw e; }
  }

  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  // Keep trying a walk until it finishes; a tap (flee) interrupts it, then
  // we pick it back up from wherever the goose ran to
  async function untilDone(fn) {
    for (;;) {
      try { return await fn(g.gen); }
      catch (e) { if (e !== ABORT) throw e; await pause(1500); }
    }
  }

  // Waddle in from a random side
  async function arrive() {
    const fromLeft = Math.random() < 0.5;
    g.el.style.display = "";
    dressForTheDay();
    g.x = fromLeft ? -gw() : W();
    g.y = rand(H() * 0.5, H() - gh());
    g.el.classList.toggle("left", !fromLeft);
    place();
    await untilDone((gen) => walkTo(
      fromLeft ? rand(W() * 0.15, W() * 0.45) : rand(W() * 0.55, W() * 0.85),
      g.y + gh(), gen, { offscreen: true }));
  }

  // Drop anything it's carrying and walk off the nearest side
  async function leave() {
    dropCard();
    await untilDone((gen) => {
      const [fx, fy] = feet();
      const toLeft = fx < W() / 2;
      return walkTo(toLeft ? -gw() / 2 - 10 : W() + gw() / 2 + 10, fy, gen, { offscreen: true });
    });
    g.el.style.display = "none";   // nothing to draw while it's away
    setPose();
  }

  async function visit(stayForMs) {
    await arrive();
    const until = Date.now() + stayForMs;
    while (Date.now() < until) {
      if (asleep()) { await pause(5000); continue; }
      const gen = g.gen;
      dressForTheDay();   // in case a visit runs past midnight
      const name = forced && actions[forced] ? forced : pick(ACTIONS);
      try {
        await actions[name](gen);
      } catch (e) {
        if (e !== ABORT) { console.error("goose", e); await pause(2000); }
        // ABORT means it was tapped: flee() is running; give it time
        await pause(1500);
      }
    }
    await leave();
  }

  async function life() {
    // A trick on repeat (?goose=steal): stay on screen for good
    if (forced && actions[forced]) return visit(Infinity);

    await pause(timing.first);
    for (;;) {
      await visit(timing.visit);
      await pause(timing.away());
      while (asleep()) await pause(60000);   // come back after the screen wakes
    }
  }

  Display.register("goose", {
    refreshSeconds: 3600,

    render(el) {
      if (g.el) return; // already alive
      const style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);

      g.layer = el;
      g.el = document.createElement("div");
      g.el.className = "goose";
      g.el.innerHTML = `<div class="goose-flip">${GOOSE_SVG}</div>${EXTRAS}`;
      el.appendChild(g.el);
      g.el.addEventListener("click", (e) => { e.stopPropagation(); flee(); });

      g.el.style.display = "none";   // hidden until its first visit
      life();
    },
  });
})();
