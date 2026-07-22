// Contact — interactive terminal/REPL over an accessible email form.
// Progressive enhancement: this whole module is optional. With no JS (or on a
// small screen) the plain <form> below works via its mailto: action. With JS,
// the terminal drives the page and can reveal + focus the form.

const EMAIL = 'eugene.vince55@gmail.com';
const GITHUB = 'https://github.com/evince55';
const LINKEDIN = 'https://www.linkedin.com/in/eugene-vincent-42472024b';
const HOMELAB_EPOCH = Date.UTC(2024, 0, 15);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function commands(term) {
  return {
    help: () => `Available commands:
  <span class="t-key">help</span>        this list
  <span class="t-key">whoami</span>      who you're talking to
  <span class="t-key">email</span>       copy my email address
  <span class="t-key">resume</span>      download my resume
  <span class="t-key">social</span>      github &amp; linkedin
  <span class="t-key">contact</span>     open the message form
  <span class="t-key">sudo hire-me</span>  the fast path
  <span class="t-key">clear</span>       clear the screen`,
    whoami: () => `eugene vincent — 2nd-year CS @ UIC, Aurora IL.
builds &amp; runs production-grade infra at home (k3s, GitOps, observability) and cost-aware local+cloud AI.
open to DevOps + AI internships — and building fast sites for local businesses.`,
    ls: () => 'projects/   dashboard/   about.txt   resume.pdf   contact.form',
    email: async () => {
      try { await navigator.clipboard.writeText(EMAIL); return `copied <a href="mailto:${EMAIL}">${EMAIL}</a> to your clipboard.`; }
      catch { return `reach me at <a href="mailto:${EMAIL}">${EMAIL}</a>`; }
    },
    resume: () => 'opening <a href="resume.pdf">resume.pdf</a> … (drop your PDF at /resume.pdf)',
    social: () => `github    <a href="${GITHUB}" rel="noopener">${GITHUB.replace('https://', '')}</a>
linkedin  <a href="${LINKEDIN}" rel="noopener">linkedin.com/in/eugene-vincent</a>`,
    uptime: () => {
      const d = Math.floor((Date.now() - HOMELAB_EPOCH) / 86400000);
      return `homelab: day ${d} — monitored the whole time. type <span class="t-key">contact</span> to say hi.`;
    },
    contact: () => { term.revealForm(); return '→ opening secure channel… the message form is ready below.'; },
    'sudo hire-me': () => {
      term.revealForm();
      return `[sudo] password for recruiter: <span class="t-muted">••••••••</span>
<span class="t-key">access granted.</span> opening the channel — the form's below, or just email me.`;
    },
    clear: () => { term.clear(); return null; },
  };
}

function initTerminal(root) {
  const body = root.querySelector('[data-term-body]');
  const input = root.querySelector('[data-term-input]');
  const formWrap = document.querySelector('[data-form-wrap]');
  const nameField = document.querySelector('#cf-name');
  if (!body || !input) return;

  const history = [];
  let hi = -1;

  const api = {
    clear() { body.innerHTML = ''; },
    revealForm() {
      if (formWrap) formWrap.classList.add('is-revealed');
      if (nameField) setTimeout(() => nameField.focus(), 60);
    },
  };
  const CMDS = commands(api);

  function line(html, cls) {
    const el = document.createElement('div');
    el.className = 't-line' + (cls ? ' ' + cls : '');
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  async function run(raw) {
    const cmd = raw.trim();
    line(`<span class="t-prompt">visitor@chai-homelab:~$</span> <span class="t-echo">${esc(cmd)}</span>`);
    if (!cmd) return;
    history.unshift(cmd); hi = -1;
    const key = cmd.toLowerCase();
    const fn = CMDS[key] || (key === 'hire-me' ? CMDS['sudo hire-me'] : null);
    if (!fn) { line(`command not found: <span class="t-err">${esc(cmd)}</span> — type <span class="t-key">help</span>`, 't-out'); return; }
    const out = await fn();
    if (out != null) line(out, 't-out');
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); run(input.value); input.value = ''; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (history.length) { hi = Math.min(hi + 1, history.length - 1); input.value = history[hi]; } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi > 0) { hi--; input.value = history[hi]; } else { hi = -1; input.value = ''; } }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); api.clear(); }
  });

  // click anywhere in the terminal focuses the prompt
  root.addEventListener('click', (e) => { if (!e.target.closest('a, button')) input.focus(); });

  // skip button + form reveal
  const skip = root.querySelector('[data-term-skip]');
  if (skip) skip.addEventListener('click', () => { api.revealForm(); });

  // boot banner
  line('<span class="t-muted">chai-homelab terminal · type</span> <span class="t-key">help</span> <span class="t-muted">to begin, or</span> <span class="t-key">contact</span> <span class="t-muted">to jump to the form.</span>');
}

function initForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const field = (id) => form.querySelector('#' + id);

  function setError(input, msg) {
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    const err = form.querySelector(`[data-err-for="${input.id}"]`);
    if (err) err.textContent = msg || '';
    return !msg;
  }
  function validate() {
    const name = field('cf-name'), email = field('cf-email'), msg = field('cf-message');
    let ok = true;
    ok = setError(name, name.value.trim() ? '' : 'Please add your name.') && ok;
    ok = setError(email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim()) ? '' : 'Enter a valid email.') && ok;
    ok = setError(msg, msg.value.trim().length >= 4 ? '' : 'A short message, please.') && ok;
    return ok;
  }

  form.addEventListener('submit', async (e) => {
    if (!validate()) { e.preventDefault(); const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    e.preventDefault(); // JS path: try the API, fall back to the mailto: the form already points at
    const btn = form.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(res.status);
      show('ok', `Thanks, ${esc(data.name || 'there')} — message received. I usually reply within a day or two.`);
      form.reset();
    } catch {
      const mail = `mailto:${EMAIL}?subject=${encodeURIComponent('Hello from chai-homelab')}&body=${encodeURIComponent((data.message || '') + '\n\n— ' + (data.name || '') + ' (' + (data.email || '') + ')')}`;
      show('err', `Couldn't reach the server just now — <a href="${mail}">open this in your mail app</a> instead, or write to <a href="mailto:${EMAIL}">${EMAIL}</a>.`);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Send message <svg class="ico" aria-hidden="true"><use href="#i-send"></use></svg>'; }
    }
  });

  function show(kind, html) {
    if (!status) return;
    status.className = 'form-status is-on ' + (kind === 'ok' ? 'is-ok' : 'is-err');
    status.innerHTML = html;
    status.setAttribute('role', kind === 'ok' ? 'status' : 'alert');
  }
}

export function initContact() {
  const term = document.querySelector('[data-terminal]');
  if (term) initTerminal(term);
  initForm();
}
