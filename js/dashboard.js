// Dashboard — live homelab observability. Vanilla, no deps. Fetches the same
// stats source the home strip uses (js/stats-source.js: /api/stats -> committed
// snapshot fallback). Renders metric values, sparklines, per-metric status dots,
// and an overall status. Loading / stale / error are first-class states driven by
// [data-dash-state] on the root. No fabricated data: every number comes from the
// feed; the "healthy" preview simply stamps the real snapshot with a fresh time.

import { fetchStats } from './stats-source.js';

const STALE_AFTER_MS = 60 * 60 * 1000; // 1h — well past the 10-min cron cadence
const motionSafe = !(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

const $ = (sel, r = document) => r.querySelector(sel);
const $$ = (sel, r = document) => [...r.querySelectorAll(sel)];
const num = (v) => (Number.isFinite(v) ? v : null);

function isStale(data, now = Date.now()) {
  const t = Date.parse((data || {}).lastUpdated);
  return Number.isNaN(t) || now - t > STALE_AFTER_MS;
}
function relTime(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'unknown';
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// worst-wins status ranking
const RANK = { healthy: 0, degraded: 1, critical: 2 };
function band(value, warn, crit, invert = false) {
  if (value == null) return 'stale';
  const bad = invert ? value <= crit : value >= crit;
  const warnable = invert ? value <= warn : value >= warn;
  if (bad) return 'critical';
  if (warnable) return 'degraded';
  return 'healthy';
}

function sparkline(values, w = 100, h = 34) {
  const vals = (values || []).filter(Number.isFinite);
  if (vals.length < 2) return '';
  const pad = 3;
  const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1;
  const n = vals.length;
  const x = (i) => (pad + (i / (n - 1)) * (w - 2 * pad));
  const y = (v) => (h - pad - ((v - min) / range) * (h - 2 * pad));
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `M${x(0).toFixed(1)},${(h - pad).toFixed(1)} L${pts.join(' L')} L${x(n - 1).toFixed(1)},${(h - pad).toFixed(1)} Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="spark__area" d="${area}"></path><path class="spark__line" pathLength="1" d="${line}"></path></svg>`;
}

function setSpark(key, values) {
  const host = $(`[data-spark="${key}"]`);
  if (!host) return;
  host.innerHTML = sparkline(values);
  const line = host.querySelector('.spark__line');
  if (line && motionSafe) {
    line.style.strokeDasharray = '1';
    line.style.strokeDashoffset = '1';
    line.classList.add('is-draw');
    requestAnimationFrame(() => requestAnimationFrame(() => { line.style.strokeDashoffset = '0'; }));
  }
}

function setText(key, text) { for (const el of $$(`[data-m="${key}"]`)) el.textContent = text; }
function setDot(key, status) { const d = $(`[data-dot="${key}"]`); if (d) d.setAttribute('data-status', status); }
function setSub(key, html) { const el = $(`[data-sub="${key}"]`); if (el) el.innerHTML = html; }

function chip(el, state, label) {
  if (!el) return;
  el.setAttribute('data-state', state);
  const t = el.querySelector('[data-chip-label]');
  if (t) t.textContent = label;
}

const root = () => $('[data-dash]');

function applyData(data, staleFlag) {
  const m = data.metrics || {};
  const tr = data.trends || {};
  const mon = data.monitoring || {};
  const rt = data.runtime || {};
  const srv = data.server || {};
  const statuses = [];

  // --- Minecraft server ---
  const tps = num(m.tps);
  setText('tps', tps != null ? String(Math.min(tps, 20)) : '—');
  { const s = tps == null ? 'stale' : band(tps, 18, 15, true); setDot('tps', s); statuses.push(s); }

  setText('players', num(m.players) != null ? `${m.players}` : '—');
  setSub('players', `of ${num(m.maxPlayers) ?? '—'} slots`);
  setDot('players', staleFlag ? 'stale' : 'healthy');

  const mspt = num(m.mspt);
  setText('mspt', mspt != null ? mspt.toFixed(1) : '—');
  { const s = mspt == null ? 'stale' : band(mspt, 25, 45); setDot('mspt', s); statuses.push(s); setSpark('mspt', tr.mspt); }

  const used = num(m.heapUsedMB), maxH = num(m.heapMaxMB);
  const pct = used != null && maxH ? Math.round((used / maxH) * 100) : null;
  setText('heap', used != null ? `${used}` : '—');
  setSub('heap', maxH ? `of ${maxH} MB &middot; <b>${pct}%</b>` : '');
  { const s = pct == null ? 'stale' : band(pct, 75, 90); setDot('heap', s);
    const bar = $('[data-bar="heap"]'); if (bar) { bar.style.width = (pct ?? 0) + '%'; bar.setAttribute('data-status', s); }
    setSpark('heap', tr.heap); statuses.push(s); }

  setText('gc', num(rt.gcTimeSec) != null ? rt.gcTimeSec.toFixed(1) : (num(m.gcCount) != null ? String(m.gcCount) : '—'));
  setSub('gc', num(m.gcCount) != null ? `${m.gcCount} collections` : '');
  setDot('gc', staleFlag ? 'stale' : 'healthy');

  // --- host / cluster ---
  const load = num(m.systemLoad);
  setText('load', load != null ? load.toFixed(2) : '—');
  { const s = load == null ? 'stale' : band(load, 4, 8); setDot('load', s); setSpark('load', tr.load); statuses.push(s); }

  const cpuArr = (tr.cpu || []).filter(Number.isFinite);
  const cpu = cpuArr.length ? cpuArr[cpuArr.length - 1] : null;
  setText('cpu', cpu != null ? cpu.toFixed(1) : '—');
  { const s = cpu == null ? 'stale' : band(cpu, 70, 90); setDot('cpu', s); setSpark('cpu', tr.cpu); statuses.push(s); }

  setText('threads', num(m.threads) != null ? String(m.threads) : '—');
  setSub('threads', num(rt.threadPeak) != null ? `peak ${rt.threadPeak}` : (num(m.threadPeak) != null ? `peak ${m.threadPeak}` : ''));
  setDot('threads', staleFlag ? 'stale' : 'healthy');

  setText('uptime', typeof m.uptime === 'string' ? m.uptime : (num(m.uptime) != null ? m.uptime + '%' : '—'));
  setSub('uptime', num(m.processUptimeDays) != null ? `${m.processUptimeDays.toFixed(1)} d process` : '');
  setDot('uptime', staleFlag ? 'stale' : 'healthy');

  const th = num(mon.targetsHealthy), tt = num(mon.targetsTotal);
  setText('targets', th != null && tt != null ? `${th}/${tt}` : '—');
  setSub('targets', 'scrape targets up');
  { const s = th == null ? 'stale' : (th === tt ? 'healthy' : (th >= tt - 1 ? 'degraded' : 'critical')); setDot('targets', s); statuses.push(s); }

  const rcon = num(m.rconMs);
  setText('rcon', rcon != null ? String(rcon) : '—');
  { const s = rcon == null ? 'stale' : band(rcon, 1000, 3000); setDot('rcon', s); statuses.push(s); }

  // --- server info ---
  const info = { name: srv.name, version: srv.version, java: srv.javaVersion, restart: srv.lastRestart ? relTime(srv.lastRestart) + ' ago' : '—' };
  for (const [k, v] of Object.entries(info)) { const el = $(`[data-info="${k}"]`); if (el) el.textContent = v || '—'; }

  // --- overall + timestamp ---
  const worst = statuses.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'healthy');
  const overallState = staleFlag ? 'stale' : (RANK[worst] >= 1 ? 'degraded' : 'healthy');
  const overallLabel = staleFlag ? 'Stale' : (overallState === 'degraded' ? 'Degraded' : 'Operational');
  chip($('[data-overall]'), overallState, overallLabel);

  const updEl = $('[data-updated]');
  if (updEl) updEl.innerHTML = staleFlag
    ? `snapshot from <b>${relTime(data.lastUpdated)}</b>`
    : `updated <b>${relTime(data.lastUpdated)}</b>`;
  const staleTime = $('[data-stale-time]'); if (staleTime) staleTime.textContent = relTime(data.lastUpdated);

  root().setAttribute('data-dash-state', staleFlag ? 'stale' : 'live');
}

function errorState() {
  root().setAttribute('data-dash-state', 'error');
  chip($('[data-overall]'), 'down', 'Feed down');
  const updEl = $('[data-updated]'); if (updEl) updEl.innerHTML = 'no response';
  const et = $('[data-err-time]'); if (et) et.textContent = new Date().toLocaleTimeString();
}

let cache = null;
function freshen(data) { return { ...data, lastUpdated: new Date().toISOString() }; }

async function live() {
  root().setAttribute('data-dash-state', 'loading');
  try {
    const data = await fetchStats({ timeoutMs: 3000 });
    cache = data;
    applyData(data, isStale(data));
  } catch {
    errorState();
  }
}

// preview-states switcher (temporary review affordance)
function renderState(state) {
  const btns = $$('[data-demo]');
  for (const b of btns) b.setAttribute('aria-pressed', b.getAttribute('data-demo') === state ? 'true' : 'false');
  if (state === 'live') return live();
  if (state === 'error') return errorState();
  if (!cache) return live();
  if (state === 'healthy') return applyData(freshen(cache), false);
  if (state === 'stale') return applyData(cache, true); // committed snapshot ts is old
}

export function initDashboard() {
  if (!root()) return;
  for (const b of $$('[data-demo]')) b.addEventListener('click', () => renderState(b.getAttribute('data-demo')));
  const refresh = $('[data-refresh]'); if (refresh) refresh.addEventListener('click', live);
  window.__dash = { renderState, live };
  live();
}
