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

# Prometheus runs inside the k3s cluster with route-prefix /prometheus. The old
# ingress URL (http://192.168.1.192/prometheus/...) 404s from the host: that
# IngressRoute matches on Host: chai-homelab.com, which a bare-IP request can't
# send, so every query failed and stale values rolled forward. Hit the Prometheus
# Service ClusterIP directly instead (reachable from the node, no Host needed).
# If the monitoring stack is reinstalled and this ClusterIP changes, find the new
# one: kubectl -n monitoring get svc kube-prometheus-stack-prometheus
PROM = os.environ.get("PROM_URL", "http://10.43.221.93:9090/prometheus/api/v1/query")
JOB = 'job="minecraft-metrics"'
FETCH_OK = 0  # live instant-query successes this run — gates the lastUpdated stamp
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
    global FETCH_OK
    url = PROM + "?query=" + urllib.parse.quote(expr)
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            val = parse_instant(resp.read().decode())
    except Exception:
        return None
    if val is not None:
        FETCH_OK += 1
    return val


def parse_range(text):
    """Value array of a Prometheus range-query response (data.result[0].values), or []."""
    d = json.loads(text)
    if d.get("status") != "success":
        return []
    result = d.get("data", {}).get("result", [])
    if not result:
        return []
    return [round(float(v[1]), 2) for v in result[0].get("values", [])]


def fetch_range(expr, hours=24, step=3600, timeout=15):
    import time
    end = int(time.time())
    start = end - hours * 3600
    qs = urllib.parse.urlencode({"query": expr, "start": start, "end": end, "step": step})
    url = PROM.replace("/query", "/query_range") + "?" + qs
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return parse_range(resp.read().decode())
    except Exception:
        return []


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
    global FETCH_OK
    FETCH_OK = 0
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

    mspt = fetch(f'minecraft_tick_average{{{JOB}}}')
    if mspt is not None and mspt >= 0:
        m["mspt"] = round(mspt, 1)
    rcon = fetch(f'scrape_duration_seconds{{{JOB},endpoint="rcon-metrics"}}')
    if rcon is not None and rcon >= 0:
        m["rconMs"] = round(rcon * 1000)
    load = fetch(f'java_lang_OperatingSystem_SystemLoadAverage{{{JOB}}}')
    if load is not None and load >= 0:
        m["systemLoad"] = round(load, 2)
    threads = fetch(f'jvm_threads_current{{{JOB}}}')
    if threads is not None and threads >= 0:
        m["threads"] = round(threads)
    gc = fetch(f'sum(jvm_gc_collection_seconds_count{{{JOB}}})')
    if gc is not None and gc >= 0:
        m["gcCount"] = round(gc)
    upsec = fetch(f'time() - process_start_time_seconds{{{JOB},endpoint="jmx-metrics"}}')
    if upsec is not None and upsec > 0:
        m["processUptimeDays"] = round(upsec / 86400, 1)

    runtime = base.setdefault("runtime", {})
    classes = fetch(f'jvm_classes_currently_loaded{{{JOB}}}')
    if classes is not None and classes >= 0:
        runtime["classesLoaded"] = round(classes)
    gct = fetch(f'sum(jvm_gc_collection_seconds_sum{{{JOB}}})')
    if gct is not None and gct >= 0:
        runtime["gcTimeSec"] = round(gct, 1)
    cpu = fetch(f'process_cpu_seconds_total{{{JOB},endpoint="jmx-metrics"}}')
    if cpu is not None and cpu >= 0:
        runtime["cpuHours"] = round(cpu / 3600, 1)
    tpk = fetch(f'jvm_threads_peak{{{JOB}}}')
    if tpk is not None and tpk >= 0:
        runtime["threadPeak"] = round(tpk)

    mon = base.setdefault("monitoring", {})
    healthy = fetch(f'sum(up{{{JOB}}})')
    total = fetch(f'count(up{{{JOB}}})')
    if healthy is not None:
        mon["targetsHealthy"] = round(healthy)
    if total is not None:
        mon["targetsTotal"] = round(total)
    for dead in ("prometheusScrapes", "rconLatency", "discordAlertsToday", "grafanaPanels"):
        mon.pop(dead, None)

    base["trends"] = {
        "heap": fetch_range(f'sum(jvm_memory_used_bytes{{{JOB},area="heap"}})/1048576'),
        "mspt": fetch_range(f'minecraft_tick_average{{{JOB}}}'),
        "load": fetch_range(f'java_lang_OperatingSystem_SystemLoadAverage{{{JOB}}}'),
        "cpu": fetch_range(f'rate(process_cpu_seconds_total{{{JOB},endpoint="jmx-metrics"}}[10m])*100'),
    }
    base.pop("recentChanges", None)

    # Honest freshness: only advance the timestamp when we actually pulled at least
    # one live value this run. If every query failed (e.g. Prometheus unreachable),
    # keep the previous lastUpdated so the site shows real staleness instead of a
    # frozen snapshot masquerading as "updated just now".
    if FETCH_OK:
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
    assert parse_range(
        '{"status":"success","data":{"result":[{"metric":{},'
        '"values":[[1,"3.1"],[2,"3.4"],[3,"3.2"]]}]}}') == [3.1, 3.4, 3.2]
    assert parse_range('{"status":"success","data":{"result":[]}}') == []
    assert parse_range('{"status":"error"}') == []
    print("prom_stats selftest OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        print(json.dumps(build(), indent=2))
