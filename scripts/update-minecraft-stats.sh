#!/usr/bin/env bash
# scripts/update-minecraft-stats.sh
# Fetches REAL Minecraft metrics from Prometheus via internal API
# Falls back to last-known-good values on failure (no corruption)
# Execution time: <200ms

cd "$(dirname "$0")/../config"

# Fetch live metrics from Prometheus and write the JSON. prom_stats.py does the
# querying + correct instant-vector parsing + per-field fallback to the existing
# file (see scripts/prom_stats.py). It writes to stdout; only overwrite the file
# on success so a Prometheus/parse failure never corrupts the last-good copy.
NEW_JSON="$(python3 "$(dirname "$0")/prom_stats.py")" && [ -n "$NEW_JSON" ] \
  && printf '%s\n' "$NEW_JSON" > minecraft-stats.json \
  || echo "[stats] metric fetch failed — kept previous minecraft-stats.json" >&2

# Push the fresh stats to the live edge endpoint (Cloudflare KV via Pages Function).
# Token lives outside git; the local write above already succeeded, so a push
# failure must never fail the cron.
STATS_TOKEN_FILE="${STATS_TOKEN_FILE:-$HOME/.aria-stats-token}"
if [ -f "$STATS_TOKEN_FILE" ]; then
  TOKEN="$(cat "$STATS_TOKEN_FILE")"
  if curl -sf --max-time 10 -X POST 'https://chai-homelab.com/api/stats' \
       -H "Authorization: Bearer $TOKEN" \
       -H 'Content-Type: application/json' \
       --data-binary @minecraft-stats.json > /dev/null; then
    echo "[stats] pushed to edge OK"
  else
    echo "[stats] edge push failed (kept local copy)" >&2
  fi
else
  echo "[stats] no token file at $STATS_TOKEN_FILE — skipping edge push" >&2
fi
