# Cloudflare setup — live homelab stats

One-time Cloudflare configuration to make `/api/stats` serve live data. The site code and the
homelab cron push step are already in place; this wires up the storage + secret. Until these
steps are done, `/api/stats` returns 404 and the site falls back to the committed
`config/minecraft-stats.json` (so nothing breaks — you'll just see a benign `/api/stats` 404 in
the browser console, which disappears once step 5's first push lands).

## 1. Generate a shared token

```bash
openssl rand -hex 32
```
Copy the value; you'll paste it in two places (steps 3 and 4).

## 2. Create a KV namespace

Cloudflare dashboard → **Workers & Pages → KV → Create a namespace**. Name it e.g.
`career-portal-stats`.

## 3. Bind the namespace to the Pages project

Cloudflare dashboard → **Workers & Pages → `career-portal` → Settings → Functions → KV namespace
bindings → Add binding**:
- **Variable name:** `STATS_KV`
- **KV namespace:** `career-portal-stats`

Add it for **Production** (and Preview too if you use preview deploys).

## 4. Add the secret env var

Same project → **Settings → Environment variables → Add variable** (Production):
- **Name:** `STATS_TOKEN`
- **Value:** the token from step 1
- Click **Encrypt**.

## 5. Put the token on the homelab

```bash
printf '%s' '<TOKEN-FROM-STEP-1>' > ~/.aria-stats-token
chmod 600 ~/.aria-stats-token
```
The cron script (`scripts/update-minecraft-stats.sh`) reads this file and POSTs the stats after
each run. (If you keep the token elsewhere, set `STATS_TOKEN_FILE` in the cron's environment.)

## 6. Redeploy once, then verify

Any push to `master` redeploys and picks up the KV binding. Then:

```bash
# force a stats run + push now (or wait for the 10-min cron):
~/MusicAppIOS/career-portal/scripts/update-minecraft-stats.sh   # adjust path to your checkout

# confirm the edge now serves live data:
curl -s https://chai-homelab.com/api/stats | python3 -m json.tool
```
`lastUpdated` should be within the last few minutes, and the dashboard should read **Live**
(not "stale"). Done.

## Rotating the token later

Update `STATS_TOKEN` (step 4) **and** `~/.aria-stats-token` (step 5) to the same new value, then
redeploy. Old pushes stop being accepted immediately.

## Notes / limits

- Cost: `$0`. ~144 KV writes/day (free cap 1,000/day); reads are cut by the 60s edge cache on
  `/api/stats` (free cap 100k/day).
- The homelab only makes an **outbound** POST — it is never exposed publicly, and the site keeps
  working (last KV value, or the static seed) even if the homelab is down.
