// Design-review Tweaks — a small, hidden panel for tuning high-impact values.
// Zero production cost: the module is only imported when the URL contains ?tweaks.
// Knobs: page accent preview, hero mesh density + motion, hero tagline variant.

const TAGLINES = [
  'I build production infrastructure — and the AI that runs on it.',
  'Production infrastructure. Cost-aware AI. Run from my own rack.',
];

const CSS = `
.tweaks { position: fixed; right: 16px; bottom: 16px; z-index: 300; width: 264px;
  background: var(--bg-2); border: 1px solid var(--line-strong); border-radius: var(--r-2);
  box-shadow: 0 24px 60px rgba(0,0,0,.5); font-family: var(--font-mono); font-size: var(--fs-0); color: var(--text-2); }
.tweaks__bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;
  border-bottom: 1px solid var(--line); color: var(--accent); letter-spacing: .14em; text-transform: uppercase; }
.tweaks__x { background: none; border: 0; color: var(--text-3); font: inherit; font-size: 14px; cursor: pointer; min-height: 32px; min-width: 32px; }
.tweaks__x:hover { color: var(--text-1); }
.tweaks__body { padding: 12px; display: grid; gap: 14px; }
.tweaks__k { color: var(--text-3); text-transform: uppercase; letter-spacing: .1em; font-size: .68rem; margin-bottom: 6px; }
.tweaks__swatches { display: flex; gap: 8px; }
.tweaks__sw { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.tweaks__sw[aria-pressed='true'] { border-color: var(--text-1); box-shadow: 0 0 0 3px var(--accent-faint); }
.tweaks input[type='range'] { width: 100%; accent-color: var(--accent); }
.tweaks select, .tweaks button.tweaks__btn { width: 100%; background: var(--bg-1); color: var(--text-1);
  border: 1px solid var(--line-strong); border-radius: var(--r-1); font: inherit; padding: 7px 9px; cursor: pointer; }
.tweaks select:hover, .tweaks button.tweaks__btn:hover { border-color: var(--accent); }
`;

const ACCENTS = [
  ['home', 'var(--accent-home)'], ['projects', 'var(--accent-projects)'],
  ['dashboard', 'var(--accent-dashboard)'], ['contact', 'var(--accent-contact)'],
];

async function rebuildMesh(density) {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  window.HERO_CFG = Object.assign(window.HERO_CFG || {}, density ? { density } : {});
  if (window.__hero) window.__hero.dispose();
  const m = await import('./hero-cluster.js');
  window.__hero = m.initHeroCluster(canvas);
}

export function initTweaks(doc = document) {
  if (doc.querySelector('.tweaks')) return;
  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.append(style);

  const el = doc.createElement('aside');
  el.className = 'tweaks';
  el.setAttribute('aria-label', 'Design tweaks');
  el.innerHTML = `
    <div class="tweaks__bar"><span>Tweaks</span><button class="tweaks__x" aria-label="Close tweaks">✕</button></div>
    <div class="tweaks__body">
      <div><div class="tweaks__k">Accent preview</div>
        <div class="tweaks__swatches">${ACCENTS.map(([p, c]) =>
    `<button class="tweaks__sw" data-p="${p}" style="background:${c}" aria-pressed="${doc.body.dataset.page === p}" aria-label="Preview ${p} accent"></button>`).join('')}
        </div>
      </div>
      <div><div class="tweaks__k">Mesh density</div>
        <input type="range" min="6000" max="24000" step="3000" value="13000" data-density aria-label="Hero mesh density (lower is denser)">
      </div>
      <div><button class="tweaks__btn" data-motion>Pause mesh</button></div>
      <div><div class="tweaks__k">Tagline</div>
        <select data-tagline aria-label="Tagline variant">
          ${TAGLINES.map((t, i) => `<option value="${i}">${i === 0 ? 'A — and the AI that runs on it' : 'B — run from my own rack'}</option>`).join('')}
        </select>
      </div>
    </div>`;
  doc.body.append(el);

  el.querySelector('.tweaks__x').addEventListener('click', () => el.remove());
  for (const b of el.querySelectorAll('.tweaks__sw')) {
    b.addEventListener('click', () => {
      doc.body.dataset.page = b.dataset.p;
      for (const o of el.querySelectorAll('.tweaks__sw')) o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
    });
  }
  let t;
  el.querySelector('[data-density]').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => rebuildMesh(30000 - Number(e.target.value)), 200); // invert: right = denser
  });
  let paused = false;
  el.querySelector('[data-motion]').addEventListener('click', (e) => {
    if (!window.__hero) return;
    paused = !paused;
    paused ? window.__hero.pause() : window.__hero.resume();
    e.target.textContent = paused ? 'Resume mesh' : 'Pause mesh';
  });
  el.querySelector('[data-tagline]').addEventListener('change', (e) => {
    const tag = doc.querySelector('.hero__tagline');
    if (tag) tag.textContent = TAGLINES[Number(e.target.value)];
  });
}
