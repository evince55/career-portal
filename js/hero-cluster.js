// Hero background — a living "cluster mesh": drifting nodes, proximity-graph
// edges, and request pulses that travel the mesh. A cheap, honest metaphor for
// the k3s / service-mesh work the site is about. Canvas 2D only — no WebGL, no
// library, one file. Replaces the old vendored Three.js synthwave shader.
//
// Loaded ONLY via dynamic import from index.html, after window load, and never
// under prefers-reduced-motion, saveData, or viewports < 768px (the CSS gradient
// fallback covers those). The scene reads the page's --accent (via the canvas's
// computed `color`), so it recolours itself per page for free.

const CFG = {
  density: 13000,   // one node per ~13000 css px^2
  maxNodes: 90,
  minDist: 118,     // edge appears when two nodes are closer than this (css px)
  drift: 0.16,      // px/frame base velocity
  hubs: 5,          // brighter "control-plane" nodes
  pulseEvery: [900, 2200], // ms between new pulses (random in range)
};

function accentRGB(canvas) {
  // .hero__canvas has `color: var(--accent)`, so computed color is fully resolved.
  const c = getComputedStyle(canvas).color || 'rgb(43,215,214)';
  const m = c.match(/(\d+(?:\.\d+)?)/g);
  if (!m) return [43, 215, 214];
  return [ +m[0], +m[1], +m[2] ];
}

export function initHeroCluster(canvas) {
  if (!canvas || !canvas.getContext) return null;
  Object.assign(CFG, (typeof window !== 'undefined' && window.HERO_CFG) || {}); // review-time overrides
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let [ar, ag, ab] = accentRGB(canvas);
  const rgba = (a) => `rgba(${ar},${ag},${ab},${a})`;

  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  let w = 0, h = 0;
  let nodes = [];
  let pulses = [];
  let rafId = 0, running = false, disposed = false;
  let last = 0, nextPulse = 0;

  function build() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(24, Math.min(CFG.maxNodes, Math.round((w * h) / CFG.density)));
    nodes = [];
    for (let i = 0; i < count; i++) {
      const hub = i < CFG.hubs;
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * CFG.drift,
        vy: (Math.random() - 0.5) * CFG.drift,
        r: hub ? 2.6 + Math.random() * 1.2 : 1 + Math.random() * 1.4,
        hub,
        tw: Math.random() * Math.PI * 2, // twinkle phase
      });
    }
    pulses = [];
  }

  function spawnPulse() {
    // pick a node and a near neighbour; the pulse travels the edge between them
    if (nodes.length < 2) return;
    const a = nodes[(Math.random() * nodes.length) | 0];
    let best = null, bestD = CFG.minDist * CFG.minDist;
    for (const b of nodes) {
      if (b === a) continue;
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (d < bestD && Math.random() < 0.5) { best = b; bestD = d; }
    }
    if (best) pulses.push({ a, b: best, t: 0, speed: 0.012 + Math.random() * 0.018 });
  }

  function step(dt) {
    for (const n of nodes) {
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      n.tw += 0.02 * dt;
    }
    for (const p of pulses) p.t += p.speed * dt;
    pulses = pulses.filter((p) => p.t < 1);
  }

  function draw(_time) {
    ctx.clearRect(0, 0, w, h);

    // soft focal glow, right of centre (keeps the left dark for hero copy)
    const gx = w * 0.72, gy = h * 0.42;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.55);
    glow.addColorStop(0, rgba(0.10));
    glow.addColorStop(1, rgba(0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // edges (proximity graph)
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CFG.minDist * CFG.minDist) {
          const d = Math.sqrt(d2);
          const alpha = (1 - d / CFG.minDist) * 0.28;
          ctx.strokeStyle = rgba(alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // request pulses travelling edges
    for (const p of pulses) {
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      const fade = Math.sin(p.t * Math.PI); // in then out
      ctx.beginPath();
      ctx.fillStyle = rgba(0.9 * fade);
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = rgba(0.18 * fade);
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // nodes
    for (const n of nodes) {
      const tw = 0.6 + 0.4 * Math.sin(n.tw);
      if (n.hub) {
        ctx.beginPath();
        ctx.fillStyle = rgba(0.12);
        ctx.arc(n.x, n.y, n.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = rgba(0.5);
        ctx.lineWidth = 1;
        ctx.arc(n.x, n.y, n.r * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.fillStyle = rgba((n.hub ? 0.95 : 0.55) * tw);
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // darken the left third so the headline always sits on quiet pixels
    const scrim = ctx.createLinearGradient(0, 0, w, 0);
    scrim.addColorStop(0, 'rgba(7,7,11,0.92)');
    scrim.addColorStop(0.42, 'rgba(7,7,11,0.35)');
    scrim.addColorStop(0.7, 'rgba(7,7,11,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
  }

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    const dtMs = Math.min(t - last, 50) || 16;
    last = t;
    const dt = dtMs / 16.67; // normalise to ~60fps units
    step(dt);
    if (t > nextPulse) {
      spawnPulse();
      nextPulse = t + CFG.pulseEvery[0] + Math.random() * (CFG.pulseEvery[1] - CFG.pulseEvery[0]);
    }
    draw(t);
  }

  function resume() {
    if (running || disposed || reduce) return;
    running = true;
    last = performance.now();
    nextPulse = last + 400;
    rafId = requestAnimationFrame(frame);
  }
  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  }

  // animate only while the tab AND the hero are visible
  let pageVisible = !document.hidden, heroVisible = true;
  function sync() { (pageVisible && heroVisible) ? resume() : pause(); }
  const onVis = () => { pageVisible = !document.hidden; sync(); };
  document.addEventListener('visibilitychange', onVis);

  let io = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((es) => { heroVisible = es.some((e) => e.isIntersecting); sync(); }, { threshold: 0.02 });
    io.observe(canvas);
  }

  let rTimer = 0;
  const onResize = () => {
    clearTimeout(rTimer);
    rTimer = setTimeout(() => { dpr = Math.min(window.devicePixelRatio || 1, 1.75); build(); draw(performance.now()); }, 180);
  };
  window.addEventListener('resize', onResize);

  function dispose() {
    if (disposed) return;
    disposed = true;
    pause();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
    if (io) io.disconnect();
  }
  window.addEventListener('pagehide', dispose, { once: true });

  build();
  draw(performance.now()); // paint one frame immediately so it's present on fade-in
  if (reduce) return { pause, resume, dispose }; // static single frame under reduced motion
  sync();
  return { pause, resume, dispose };
}

export default initHeroCluster;
