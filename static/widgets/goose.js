// Goose widget: a goose that lives on the display and causes trouble.
//
// It wanders, honks, steals forecast cards, pecks the clock, tracks mud and
// naps. Tap it and it honks and runs off.
//
// Turn it on by adding "goose" to WIDGETS in config.py.
// Watch one trick on repeat on your laptop, e.g.
//   http://localhost:5050/?goose=steal   (wander, honk, steal, peck, mud, nap)
(function () {
  // ---- Tweak the goose here ----
  const SIZE_VMIN = 15;          // how big the goose is
  const WALK_SPEED = 0.16;       // screen-heights per second
  const RUN_SPEED = 0.6;
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
  function walkTo(fx, fy, gen, { speed = WALK_SPEED, onStep } = {}) {
    const tx = Math.max(0, Math.min(W() - gw(), fx - gw() / 2));
    const ty = Math.max(0, Math.min(H() - gh(), fy - gh()));
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

  async function life() {
    // Waddle onto the screen before doing anything else
    try { await walkTo(rand(W() * 0.2, W() * 0.5), H() * rand(0.75, 0.95), g.gen); }
    catch (e) { if (e !== ABORT) throw e; }
    for (;;) {
      if (asleep()) { await new Promise((r) => setTimeout(r, 5000)); continue; }
      const gen = g.gen;
      const name = forced && actions[forced] ? forced : pick(ACTIONS);
      try {
        await actions[name](gen);
      } catch (e) {
        if (e !== ABORT) { console.error("goose", e); await new Promise((r) => setTimeout(r, 2000)); }
        // ABORT means it was tapped: flee() is running; give it time
        await new Promise((r) => setTimeout(r, 1500));
      }
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

      // Start just off the left edge; life() walks it in
      g.x = -gw();
      g.y = H() * 0.7;
      place();
      life();
    },
  });
})();
