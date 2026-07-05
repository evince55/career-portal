#!/usr/bin/env python3
"""Fetch live Minecraft/JVM metrics from Prometheus and emit the stats JSON.

Prometheus /api/v1/query returns an *instant vector*:
    {"status":"success","data":{"result":[{"metric":{...},"value":[<ts>,"<str>"]}]}}
The previous version of this script read d['result'] (should be d['data']['result'])
and r['values'] (range-query field; instant queries use 'value'), and batched four
query= params into one request (only one is honored) — so every parse failed and it
silently fell back to seed values. See scripts/prom_stats.py --selftest for the guard.

Live fields: tps, players, heapUsedMB, heapMaxMB, uptime. Everything else in the JSON
(server info, recentChanges, monitoring) is carried over from the existing file.
Any field whose query fails/returns something implausible keeps its previous value.
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

PROM = os.environ.get("PROM_URL", "http://192.168.1.192/prometheus/api/v1/query")
JOB = 'job="minecraft-metrics"'
HERE = os.path.dirname(os.path.abspath(__file__))
STATS_PATH = os.path.join(HERE, "..", "config", "minecraft-stats.json")


def parse_instant(text):
    """Scalar value of a Prometheus instant-query response, or None if absent/failed."""
    d = json.loads(text)
    if d.get("status") != "success":
        return None
    result = d.get("data", {}).get("result", [])
    if not result:
        return None
    return float(result[0]["value"][1])


def fetch(expr, timeout=10):
    url = PROM + "?query=" + urllib.parse.quote(expr)
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return parse_instant(resp.read().decode())
    except Exception:
        return None


def load_base():
    try:
        with open(STATS_PATH) as f:
            return json.load(f)
    except Exception:
        return {
            "server": {"name": "Eugene's Homelab MC", "version": "PaperMC 26.1.2",
                       "javaVersion": "Java 25", "lastRestart": "2026-06-10T18:30:00Z"},
            "metrics": {"tps": 20, "players": 0, "maxPlayers": 20, "uptime": "—",
                        "heapUsedMB": 0, "heapMaxMB": 0},
            "monitoring": {"discordAlertsToday": 0, "rconLatency": "15ms",
                           "prometheusScrapes": 894000, "grafanaPanels": 5},
            "recentChanges": [],
        }


def build():
    base = load_base()
    m = base.setdefault("metrics", {})

    tps = fetch(f'paper_tps_1m{{{JOB}}}')
    if tps is not None and 0 <= tps <= 100:
        m["tps"] = min(round(tps), 20)  # clamp to Minecraft's hard 20 TPS cap

    players = fetch(f'sum(minecraft_player_online{{{JOB}}})')
    if players is not None and players >= 0:
        m["players"] = round(players)

    used = fetch(f'sum(jvm_memory_used_bytes{{{JOB},area="heap"}})')
    if used is not None and used > 0:
        m["heapUsedMB"] = round(used / 1048576)

    mx = fetch(f'sum(jvm_memory_max_bytes{{{JOB},area="heap"}})')
    if mx is not None and mx > 0:
        m["heapMaxMB"] = round(mx / 1048576)

    up = fetch(f'avg(avg_over_time(up{{{JOB}}}[7d]))')
    if up is not None and 0 <= up <= 1:
        m["uptime"] = f"{round(up * 100, 1)}%"

    base["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return base


def selftest():
    ok = parse_instant(
        '{"status":"success","data":{"resultType":"vector",'
        '"result":[{"metric":{},"value":[1783283398.0,"20"]}]}}')
    assert ok == 20.0, ok
    assert parse_instant('{"status":"success","data":{"result":[]}}') is None
    assert parse_instant('{"status":"error"}') is None
    # The exact real-response shape the OLD code (d['result'] / r['values']) failed on:
    assert parse_instant('{"status":"success","data":{"result":[{"value":[1.0,"1861"]}]}}') == 1861.0
    print("prom_stats selftest OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        print(json.dumps(build(), indent=2))
