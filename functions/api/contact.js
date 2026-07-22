// Cloudflare Pages Function at /api/contact.
//   POST -> validate a contact-form submission and relay it to my inbox via Resend.
// Bindings: env.RESEND_API_KEY (secret, required to actually send), env.CONTACT_TO and
// env.CONTACT_DOMAIN (optional overrides). With no key bound this answers 503 and the
// form falls back to its mailto: link — see docs/cloudflare-contact-setup.md.
// Pure validateContact() is unit-tested.
const MAX_BODY = 16384;
const LIMITS = { name: 200, email: 320, subject: 300, message: 5000 };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Hidden field in contact.html that only a bot fills. Exported so tests/site-integrity.mjs
// can assert the markup and this handler never drift apart.
export const HONEYPOT = 'website';

const DEFAULT_TO = 'eugene.vince55@gmail.com';
const DEFAULT_DOMAIN = 'chai-homelab.com';

// Parse + check a submission. Throws on anything we won't relay; returns the
// trimmed fields on success. `subject` is optional — the live form omits it.
export function validateContact(text) {
  const obj = JSON.parse(text); // throws on non-JSON
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('not an object');

  const out = {};
  for (const key of ['name', 'email', 'message']) {
    if (typeof obj[key] !== 'string' || !obj[key].trim()) throw new Error(`missing ${key}`);
    out[key] = obj[key].trim();
  }
  out.subject = typeof obj.subject === 'string' && obj.subject.trim()
    ? obj.subject.trim()
    : 'New message from the site';
  // Filled honeypot => almost certainly a bot. Flagged, not thrown: the caller answers
  // 200 so the sender learns nothing about why it didn't arrive.
  out.trap = typeof obj[HONEYPOT] === 'string' && obj[HONEYPOT].trim() !== '';

  for (const [key, max] of Object.entries(LIMITS)) {
    if (out[key].length > max) throw new Error(`${key} too long`);
  }
  // Guard replyTo: a malformed address would bounce the whole send.
  if (!EMAIL_RE.test(out.email)) throw new Error('invalid email');
  return out;
}

const json = (obj, status, extra) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...(extra || {}) }
  });

async function sendViaResend(key, to, domain, { name, email, subject, message }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Portfolio Contact <contact@${domain}>`,
      to,
      reply_to: email,
      subject: `[Portfolio] ${subject} — from ${name}`,
      text: `From: ${name}\nEmail: ${email}\n\n${message}\n\n---\nSent from the ${domain} contact form`
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export async function onRequestPost(context) {
  const key = context.env.RESEND_API_KEY;
  // Not configured yet: say so honestly rather than pretending the message landed.
  if (!key) return json({ error: 'contact relay not configured' }, 503);

  const body = await context.request.text();
  if (body.length > MAX_BODY) return json({ error: 'too large' }, 413);

  let fields;
  try {
    fields = validateContact(body);
  } catch {
    return json({ error: 'invalid submission' }, 400);
  }

  // Logged, not silent: if a real submission ever trips this, the Function log is the
  // only place it will show up — nobody gets an error to report.
  if (fields.trap) {
    console.log(`[contact] honeypot tripped, dropped without relaying (from: ${fields.email})`);
    return json({ ok: true }, 200);
  }

  try {
    await sendViaResend(key, context.env.CONTACT_TO || DEFAULT_TO, context.env.CONTACT_DOMAIN || DEFAULT_DOMAIN, fields);
  } catch (err) {
    console.error('[contact] relay failed:', err.message);
    return json({ error: 'could not send' }, 502);
  }
  return json({ ok: true }, 200);
}
