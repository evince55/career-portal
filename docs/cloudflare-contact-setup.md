# Cloudflare setup — contact form relay

One-time configuration to make `/api/contact` actually deliver mail. The site code
(`functions/api/contact.js` + `js/contact.js`) is already in place; this wires up the email
provider and the secret.

Until these steps are done, `/api/contact` returns **503** and the form falls back to its
`mailto:` link — the visitor sees "Couldn't reach the server just now — open this in your mail
app instead". Nothing throws, but the success path can't fire, so finish this to get the
"Thanks, <name> — message received" reply that recruiters expect.

## 1. Create a Resend account and verify the domain

Sign up at <https://resend.com>, then **Domains → Add Domain** → `chai-homelab.com`. Resend gives
you DKIM/SPF DNS records; add them in the Cloudflare DNS tab for the zone. Wait for the domain to
show **Verified**.

Domain verification matters: the Function sends `from: Portfolio Contact <contact@chai-homelab.com>`.
An unverified domain makes Resend reject the send and the Function answers 502 (the form falls
back to mailto:, so visitors still have a route).

> Testing before the domain verifies? Set `CONTACT_DOMAIN` to `resend.dev` in step 3 — Resend's
> shared sandbox domain only delivers to the address that owns the account.

## 2. Create an API key

Resend dashboard → **API Keys → Create API Key**, permission **Sending access**. Copy the value —
it is shown once.

## 3. Add the env vars to the Pages project

Cloudflare dashboard → **Workers & Pages → `career-portal` → Settings → Environment variables →
Add variable**, for **Production** (and Preview if you use preview deploys):

| Variable | Type | Value |
|----------|------|-------|
| `RESEND_API_KEY` | **Secret** (Encrypt) | the key from step 2 |
| `CONTACT_TO` | Plaintext, optional | recipient; defaults to `eugene.vince55@gmail.com` |
| `CONTACT_DOMAIN` | Plaintext, optional | send-from domain; defaults to `chai-homelab.com` |

Mark `RESEND_API_KEY` as a **secret**, not plaintext — plaintext vars are readable in the
dashboard and in build logs.

## 4. Redeploy

Env var changes only reach the Functions runtime on the next deploy. Push to `master` (CI runs
`npm test`, then deploys) or hit **Retry deployment** on the latest build.

## 5. Verify

```bash
curl -si -X POST https://chai-homelab.com/api/contact -H 'Content-Type: application/json' -d '{"name":"Test","email":"you@example.com","message":"hello from curl"}' | head -1
```

- `HTTP/2 200` → configured; check the inbox.
- `HTTP/2 503` → `RESEND_API_KEY` isn't reaching the runtime (missed step 3, or step 4's redeploy).
- `HTTP/2 502` → key present but Resend refused — usually an unverified domain. The Function logs
  the provider's message; read it under **Workers & Pages → career-portal → Functions → Logs**.
- `HTTP/2 400` → the payload failed validation (`name`, `email`, `message` required; email must
  parse). Not a config problem.

Then submit the real form at <https://chai-homelab.com/contact.html> and confirm the green
"message received" status appears.

## Notes

- The Function caps the body at 16 KB and each field at its own limit (message 5000 chars), so a
  runaway paste can't be relayed.
- The sender's address becomes `reply_to`, so replying from your mail client goes to them, not to
  `contact@chai-homelab.com`.
- There is no spam protection beyond validation. If the form starts attracting bots, the cheapest
  next step is a honeypot field in `contact.html` that the Function rejects when filled.
