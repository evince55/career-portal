# Cloudflare setup — contact form relay

One-time configuration to make `/api/contact` actually deliver mail. The site code
(`functions/api/contact.js` + `js/contact.js`) is already in place; this wires up the email
provider and the secret.

Until these steps are done, `/api/contact` returns **503** and the form falls back to its
`mailto:` link — the visitor sees "Couldn't reach the server just now — open this in your mail
app instead". Nothing throws, but the success path can't fire, so finish this to get the
"Thanks, <name> — message received" reply that recruiters expect.

## 1. Use the domain already verified in Resend

**The free tier allows exactly one verified domain, and that slot holds
`aria-websites.org` — not this site's domain.** So the Function sends
`from: Portfolio Contact <contact@aria-websites.org>`, which is the default and needs no
configuration. Do not point it at `chai-homelab.com`: adding a second domain is a paid plan,
and sending from an unverified one is rejected outright.

Only the **From** domain has to be verified. The recipient does not, so mail still lands in
`eugene.vince55@gmail.com`, and `reply_to` is set to the visitor's address, so hitting Reply
answers the visitor rather than the sending domain. The mismatch is cosmetic: it shows up in
the From line of a mail that only ever reaches your own inbox.

If a domain ever does need verifying, Resend gives you DKIM/SPF DNS records under
**Domains → Add Domain**; add them in the Cloudflare DNS tab for that zone and wait for
**Verified**. Sending from an unverified domain makes Resend refuse and the Function answer
502 — and Cloudflare replaces that 502 with its own error page, so the response body tells you
nothing. The log line is the only diagnosis; see step 5.

> Want to isolate a problem from domain config entirely? Set `CONTACT_DOMAIN` to `resend.dev`
> in step 3 — Resend's shared sandbox needs no verification but only delivers to the address
> that owns the Resend account. Fine as a diagnostic, not as the destination.

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
| `CONTACT_DOMAIN` | Plaintext, optional | send-from domain; defaults to `aria-websites.org`, the verified one — leave unset unless you move domains |

Mark `RESEND_API_KEY` as a **secret**, not plaintext — plaintext vars are readable in the
dashboard and in build logs.

> **Env vars only apply to deployments created after you set them.** Setting a variable does
> not touch the deployment already serving traffic, so nothing changes until you redeploy —
> push a commit, or use **Retry deployment** on the latest build. This is the single most
> common reason a correct-looking configuration appears to do nothing.

## 4. Redeploy

Env var changes only reach the Functions runtime on the next deploy. Push to `master` (CI runs
`npm test`, then deploys) or hit **Retry deployment** on the latest build.

## 5. Verify

```bash
curl -si -X POST https://chai-homelab.com/api/contact -H 'Content-Type: application/json' -d '{"name":"Test","email":"you@example.com","message":"hello from curl"}' | head -1
```

- `HTTP/2 200` → configured; check the inbox.
- `HTTP/2 503` → `RESEND_API_KEY` isn't reaching the runtime (missed step 3, or step 4's redeploy).
- `HTTP/2 502` → key present but Resend refused — usually the send-from domain. **The body is
  useless here:** Cloudflare replaces a Function's 5xx response with its own
  `error code: 502` page, so the JSON the Function returned never reaches you. It looks
  identical to the Worker crashing. Read the log instead (below).
- `HTTP/2 400` → the payload failed validation (`name`, `email`, `message` required; email must
  parse). Not a config problem.

To see why Resend refused, tail the Function while you submit:

```bash
npx wrangler pages deployment tail --project-name=career-portal
```

Look for `[contact] relay failed: Resend <status>: <body>` — that line carries the provider's
own explanation (403 almost always means the send-from domain). `[contact] unhandled failure:`
instead means the Function itself broke, not Resend. The same logs are in the dashboard under
**Workers & Pages → career-portal → Functions → Logs**.

Then submit the real form at <https://chai-homelab.com/contact> and confirm the green
"message received" status appears. To exercise the endpoint *without* sending mail, include
`"website": "bot"` in the payload — that trips the honeypot, so the Function answers 200 and
drops the message before it reaches Resend.

## Notes

- The Function caps the body at 16 KB and each field at its own limit (message 5000 chars), so a
  runaway paste can't be relayed.
- The sender's address becomes `reply_to`, so replying from your mail client goes to them, not to
  the `contact@aria-websites.org` the mail was sent from.
- Spam protection is a honeypot: `contact.html` carries a hidden `website` input that no person
  can see, focus, or tab into, and the Function drops any submission that arrives with it filled.
  A trapped submission gets a **200**, not an error, so a bot can't probe its way around it —
  which means trapped mail is invisible except in the Function logs. If a real person ever reports
  sending a message you never received, search the logs for `honeypot tripped` first.
- The honeypot field name lives in one place (`HONEYPOT` in `functions/api/contact.js`) and
  `tests/site-integrity.mjs` asserts the markup still matches it, so renaming one side fails CI.
