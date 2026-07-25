import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateContact, onRequestPost } from '../functions/api/contact.js';

const GOOD = JSON.stringify({ name: 'Dana', email: 'dana@example.com', message: 'Hello there' });

function postReq(body) {
  return { text: async () => body };
}

// Swap global fetch for the duration of one call, capturing what Resend was sent.
async function withFetch(impl, fn) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return impl(url, init); };
  try { return { result: await fn(), calls }; } finally { globalThis.fetch = real; }
}
const ok = () => new Response('{}', { status: 200 });

describe('validateContact', () => {
  it('accepts the fields the live form actually posts', () => {
    const o = validateContact(GOOD);
    assert.equal(o.name, 'Dana');
    assert.equal(o.subject, 'New message from the site'); // form has no subject input
  });
  it('trims whitespace and keeps a supplied subject', () => {
    const o = validateContact(JSON.stringify({ name: '  Dana  ', email: 'd@e.co', message: ' hi ', subject: ' Roles ' }));
    assert.equal(o.name, 'Dana');
    assert.equal(o.message, 'hi');
    assert.equal(o.subject, 'Roles');
  });
  it('rejects non-JSON, non-objects, and arrays', () => {
    assert.throws(() => validateContact('nope'));
    assert.throws(() => validateContact('42'));
    assert.throws(() => validateContact('[]'));
  });
  it('rejects missing, blank, and non-string fields', () => {
    assert.throws(() => validateContact('{"email":"d@e.co","message":"hi"}'));
    assert.throws(() => validateContact('{"name":"D","message":"hi"}'));
    assert.throws(() => validateContact('{"name":"D","email":"d@e.co"}'));
    assert.throws(() => validateContact('{"name":"   ","email":"d@e.co","message":"hi"}'));
    assert.throws(() => validateContact('{"name":5,"email":"d@e.co","message":"hi"}'));
  });
  it('rejects a malformed email (it becomes the reply-to)', () => {
    assert.throws(() => validateContact('{"name":"D","email":"not-an-email","message":"hi"}'));
  });
  it('rejects over-long fields', () => {
    const long = (k, n) => JSON.stringify({ name: 'D', email: 'd@e.co', message: 'hi', [k]: 'x'.repeat(n) });
    assert.throws(() => validateContact(long('name', 201)));
    assert.throws(() => validateContact(long('subject', 301)));
    assert.throws(() => validateContact(long('message', 5001)));
  });
});

describe('honeypot', () => {
  it('is not tripped when the field is absent or left empty (the human path)', () => {
    assert.equal(validateContact(GOOD).trap, false);
    assert.equal(validateContact(JSON.stringify({ ...JSON.parse(GOOD), website: '' })).trap, false);
    assert.equal(validateContact(JSON.stringify({ ...JSON.parse(GOOD), website: '   ' })).trap, false);
  });
  it('is tripped when the field carries a value', () => {
    assert.equal(validateContact(JSON.stringify({ ...JSON.parse(GOOD), website: 'http://spam.example' })).trap, true);
  });
  it('answers 200 but never calls Resend, so the bot learns nothing', async () => {
    const body = JSON.stringify({ ...JSON.parse(GOOD), website: 'http://spam.example' });
    const { result, calls } = await withFetch(ok, () => onRequestPost({ request: postReq(body), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 200);
    assert.equal((await result.json()).ok, true);
    assert.equal(calls.length, 0, 'a trapped submission must not be relayed');
  });
  it('still relays a submission that merely mentions a URL in the message', async () => {
    const body = JSON.stringify({ name: 'Dana', email: 'dana@example.com', message: 'see http://example.com' });
    const { calls } = await withFetch(ok, () => onRequestPost({ request: postReq(body), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(calls.length, 1);
  });
});

describe('onRequestPost', () => {
  it('503 when RESEND_API_KEY is unbound (pre-config: client shows the mailto fallback)', async () => {
    const res = await onRequestPost({ request: postReq(GOOD), env: {} });
    assert.equal(res.status, 503);
  });
  it('413 on oversize body, before parsing', async () => {
    const res = await onRequestPost({ request: postReq('x'.repeat(20000)), env: { RESEND_API_KEY: 'k' } });
    assert.equal(res.status, 413);
  });
  it('400 on an invalid submission', async () => {
    const { result } = await withFetch(ok, () => onRequestPost({ request: postReq('nope'), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 400);
  });
  it('does not call Resend when validation fails', async () => {
    const { calls } = await withFetch(ok, () => onRequestPost({ request: postReq('nope'), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(calls.length, 0);
  });
  it('502 when Resend rejects the send', async () => {
    const bad = () => new Response('nope', { status: 422 });
    const { result } = await withFetch(bad, () => onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 502);
  });
  it('502 when the fetch itself throws', async () => {
    const boom = () => { throw new Error('network down'); };
    const { result } = await withFetch(boom, () => onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 502);
  });
  it('200 on success — the path js/contact.js needs for its success message', async () => {
    const { result } = await withFetch(ok, () => onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 200);
    assert.equal((await result.json()).ok, true);
  });
  it('sends to Resend with a bearer key and the sender as reply_to', async () => {
    const { calls } = await withFetch(ok, () => onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer k');
    const sent = JSON.parse(calls[0].init.body);
    assert.equal(sent.reply_to, 'dana@example.com');
    assert.equal(sent.to, 'eugene.vince55@gmail.com');
    assert.match(sent.subject, /^\[Portfolio\]/);
    assert.match(sent.text, /Hello there/);
  });
  it('honours CONTACT_TO and CONTACT_DOMAIN overrides', async () => {
    const env = { RESEND_API_KEY: 'k', CONTACT_TO: 'other@example.com', CONTACT_DOMAIN: 'example.net' };
    const { calls } = await withFetch(ok, () => onRequestPost({ request: postReq(GOOD), env }));
    const sent = JSON.parse(calls[0].init.body);
    assert.equal(sent.to, 'other@example.com');
    assert.equal(sent.from, 'Portfolio Contact <contact@example.net>');
  });
});

describe('relay failure handling', () => {
  // Production hit a platform-level 502 (Cloudflare's own error page) instead of
  // this handler's JSON, which means the Worker died rather than answering. These
  // pin down that the handler always answers, whatever Resend or the runtime does.

  it('answers JSON 502 when Resend rejects, and never throws', async () => {
    const reject = () => new Response('domain not verified', { status: 403 });
    const { result } = await withFetch(reject, () =>
      onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 502);
    assert.equal(result.headers.get('Content-Type'), 'application/json');
    assert.deepEqual(await result.json(), { error: 'could not send' });
  });

  it('survives a thrown non-Error, which has no .message to read', async () => {
    // `catch (err) { err.message }` is itself a crash vector: if err is null or a
    // string, reading .message throws inside the catch and the Worker 502s.
    const throwString = () => { throw 'network exploded'; };
    const { result } = await withFetch(throwString, () =>
      onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 502);
    assert.deepEqual(await result.json(), { error: 'could not send' });
  });

  it('survives a thrown null', async () => {
    const throwNull = () => { throw null; };
    const { result } = await withFetch(throwNull, () =>
      onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.equal(result.status, 502);
  });

  it('records the Resend status code so the log says which failure it was', async () => {
    const reject = () => new Response('domain not verified', { status: 403 });
    const seen = [];
    const realErr = console.error;
    console.error = (...a) => seen.push(a.join(' '));
    try {
      await withFetch(reject, () =>
        onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    } finally { console.error = realErr; }
    const line = seen.join('\n');
    assert.match(line, /403/, `log must carry the Resend status, got: ${line}`);
    assert.match(line, /domain not verified/, 'log must carry the Resend body');
  });

  it('never leaks the Resend response to the caller', async () => {
    const reject = () => new Response('secret-ish upstream detail', { status: 403 });
    const { result } = await withFetch(reject, () =>
      onRequestPost({ request: postReq(GOOD), env: { RESEND_API_KEY: 'k' } }));
    assert.ok(!(await result.text()).includes('secret-ish'), 'upstream detail must stay in the log');
  });
});
