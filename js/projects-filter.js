// Projects filter + search — progressive enhancement. All cards render in the
// HTML; this module only shows/hides them, so the page works with no JS (you get
// the full grid). Shared by both browse layouts (tree folders and chip toggles
// are both [data-proj-filter] controls).
//
// Cards:    [data-proj-card] with data-cat="ai infra" (space-sep) + data-search="…"
// Filters:  [data-proj-filter="ai|all"] (buttons — tree folders or chips)
// Search:   [data-proj-search] (input)
// Counts:   [data-proj-count] (visible total), [data-cat-count="ai"] (per-category)
// Empty:    [data-proj-empty]
// Groups:   [data-proj-filtergroup] wrapper enables arrow-key roving

export function initProjectsFilter(root = document) {
  const cards = [...root.querySelectorAll('[data-proj-card]')];
  if (!cards.length) return null;
  const filters = [...root.querySelectorAll('[data-proj-filter]')];
  const searchEls = [...root.querySelectorAll('[data-proj-search]')];
  const empty = root.querySelector('[data-proj-empty]');
  let activeCat = 'all';
  let query = '';

  // per-category counts (computed once from the static markup)
  const counts = { all: cards.length };
  for (const card of cards) {
    for (const c of (card.getAttribute('data-cat') || '').split(/\s+/).filter(Boolean)) {
      counts[c] = (counts[c] || 0) + 1;
    }
  }
  for (const el of root.querySelectorAll('[data-cat-count]')) {
    const k = el.getAttribute('data-cat-count');
    if (counts[k] != null) el.textContent = String(counts[k]);
  }

  function apply() {
    let shown = 0;
    for (const card of cards) {
      const cats = (card.getAttribute('data-cat') || '').split(/\s+/);
      const matchCat = activeCat === 'all' || cats.includes(activeCat);
      const hay = (card.getAttribute('data-search') || card.textContent || '').toLowerCase();
      const show = matchCat && (!query || hay.includes(query));
      card.classList.toggle('is-hidden', !show);
      if (show) shown++;
    }
    for (const el of root.querySelectorAll('[data-proj-count]')) el.textContent = String(shown);
    if (empty) empty.classList.toggle('is-on', shown === 0);
    for (const f of filters) {
      const on = (f.getAttribute('data-proj-filter') || 'all') === activeCat;
      if (f.hasAttribute('aria-pressed')) f.setAttribute('aria-pressed', on ? 'true' : 'false');
      else f.setAttribute('aria-current', on ? 'true' : 'false');
    }
  }

  for (const f of filters) {
    f.addEventListener('click', (e) => {
      e.preventDefault();
      activeCat = f.getAttribute('data-proj-filter') || 'all';
      apply();
    });
  }

  for (const s of searchEls) {
    s.addEventListener('input', () => {
      query = s.value.trim().toLowerCase();
      for (const o of searchEls) if (o !== s) o.value = s.value; // keep any duplicate boxes in sync
      apply();
    });
    s.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { s.value = ''; query = ''; apply(); }
    });
  }

  // arrow-key roving inside a filter group (chips / tree)
  for (const group of root.querySelectorAll('[data-proj-filtergroup]')) {
    const items = [...group.querySelectorAll('[data-proj-filter]')];
    group.addEventListener('keydown', (e) => {
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % items.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + items.length) % items.length;
      if (n != null) { e.preventDefault(); items[n].focus(); }
    });
  }

  // "/" focuses search from anywhere (unless already typing)
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      const first = searchEls[0];
      if (first) { e.preventDefault(); first.focus(); }
    }
  });

  apply();
  return { apply };
}
