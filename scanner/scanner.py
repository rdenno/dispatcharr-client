"""Dispatcharr stream health scanner.

Every SCAN_INTERVAL_HOURS (and on demand), probes the streams of the channels in one channel
profile and fixes channels whose primary stream is broken:

  * Skips auto-created (event) channels and any groups in EXCLUDE_GROUPS.
  * Never probes an M3U account that is currently streaming to someone; if every account
    is busy the scan waits. Probes run one at a time through Dispatcharr's preview path,
    so provider connection limits and user agents still apply.
  * If a channel's primary stream fails, the best passing stream already on the channel is
    moved to the top. If none pass, it searches for alternatives (skipping streams named like
    the failed ones: the same stream on the other source is usually broken too), probes a
    few, and adds the best to the top.

Results are served at GET /results and a scan can be started with POST /scan.
"""

import json
import os
import re
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from dispatcharr import Dispatcharr
from probe import mad, probe

DISPATCHARR_URL = os.environ.get("DISPATCHARR_URL", "http://host.docker.internal:9191")
API_KEY = os.environ["DISPATCHARR_API_KEY"]
SCANNER_TOKEN = os.environ.get("SCANNER_TOKEN", "")
PROFILE_NAME = os.environ.get("PROFILE_NAME", "Plex")
EXCLUDE_GROUPS = {g.strip().lower() for g in os.environ.get("EXCLUDE_GROUPS", "").split(",") if g.strip()}
SKIP_AUTO_CREATED = os.environ.get("SKIP_AUTO_CREATED", "true").lower() == "true"
AUTO_FIX = os.environ.get("AUTO_FIX", "true").lower() == "true"
INTERVAL_HOURS = float(os.environ.get("SCAN_INTERVAL_HOURS", "6"))
SAMPLE_SECONDS = int(os.environ.get("SAMPLE_SECONDS", "25"))
MAX_CANDIDATES = int(os.environ.get("MAX_CANDIDATES", "4"))
BUSY_RETRY_MINUTES = int(os.environ.get("BUSY_RETRY_MINUTES", "30"))
STATE_FILE = os.environ.get("STATE_FILE", "/data/state.json")

RANK = {"ok": 2, "warn": 1, "fail": 0}
USER_AGENT = "dispatcharr-health/1"
PROBE_GAP_SECONDS = 5  # let Dispatcharr release the provider connection between probes

api = Dispatcharr(DISPATCHARR_URL, API_KEY)
lock = threading.Lock()
scan_requested = threading.Event()


def load_state() -> dict:
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"streams": {}, "channels": {}, "actions": [], "status": {}}


state = load_state()
state.setdefault("status", {})
state["status"].update({"running": False, "phase": "idle"})


def save_state():
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f)
    os.replace(tmp, STATE_FILE)


def set_status(**kw):
    with lock:
        state["status"].update(kw)
        save_state()


def log(msg: str):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), msg, flush=True)


# --- Which sources are free -------------------------------------------------------------


def live_usage(profile_to_account: dict[int, int]) -> tuple[set[int], dict[int, bool]]:
    """M3U accounts with a real viewer right now, and {stream_id: healthy} for what they watch.

    The scanner's own probes (identified by user agent) don't count.
    """
    busy, live_streams = set(), {}
    for ch in api.proxy_status():
        clients = ch.get("clients") or []
        viewers = [c for c in clients if USER_AGENT not in (c.get("user_agent") or "")]
        if viewers or (not clients and (ch.get("client_count") or 0) > 0):
            acct = profile_to_account.get(ch.get("m3u_profile_id"))
            if acct:
                busy.add(acct)
            if ch.get("stream_id"):
                live_streams[ch["stream_id"]] = ch.get("healthy") is not False
    return busy, live_streams


def busy_accounts(profile_to_account: dict[int, int]) -> set[int]:
    return live_usage(profile_to_account)[0]


# --- Probing --------------------------------------------------------------------------


def probe_stream(stream: dict, account_names: dict[int, str]) -> dict:
    url = api.preview_url(stream["stream_hash"])
    result = probe(url, seconds=SAMPLE_SECONDS, headers={"X-API-Key": API_KEY}, user_agent=USER_AGENT)
    time.sleep(PROBE_GAP_SECONDS)

    previous = state["streams"].get(str(stream["id"]), {})
    repeat = matches_previous(result["thumbs"], previous.get("thumbs") or [])
    if repeat and result["status"] == "ok":
        result["status"] = "warn"
        result["issues"].append("same footage as the last scan (possible replay loop)")

    entry = {
        "stream_id": stream["id"],
        "name": stream["name"],
        "account_id": stream.get("m3u_account"),
        "account": account_names.get(stream.get("m3u_account"), "custom"),
        "status": result["status"],
        "issues": result["issues"],
        "metrics": result["metrics"],
        "thumbs": result["thumbs"],
        "checked_at": time.time(),
    }
    with lock:
        state["streams"][str(stream["id"])] = entry
        save_state()
    log(f"  {result['status']:4} [{stream['id']}] {stream['name']} ({entry['account']}) {result['issues']}")
    return entry


def matches_previous(current: list[str], previous: list[str]) -> bool:
    """True if 6+ consecutive keyframes match a run of keyframes from the previous scan.

    Live TV taken hours apart shouldn't repeat; a long replay loop does. Short repeats
    (ads, promos) are filtered out by requiring a long run.
    """
    if len(current) < 6 or len(previous) < 6:
        return False
    cur = [bytes.fromhex(t) for t in current]
    prev = [bytes.fromhex(t) for t in previous]
    for offset in range(-len(cur) + 6, len(prev) - 5):
        run = best = 0
        for i, c in enumerate(cur):
            j = i + offset
            if 0 <= j < len(prev) and mad(c, prev[j]) < 2.5:
                run += 1
                best = max(best, run)
            else:
                run = 0
        if best >= 6:
            return True
    return False


def score(entry: dict) -> tuple:
    m = entry.get("metrics", {})
    return (RANK.get(entry["status"], 0), m.get("height", 0), m.get("fps", 0), m.get("kbps", 0))


# --- Channel logic --------------------------------------------------------------------


def clean_name(name: str) -> str:
    name = re.sub(r"\b(HD|FHD|UHD|4K|SD|HEVC|H\.?265|US|USA|UK|CA|RAW)\b", " ", name, flags=re.I)
    name = re.sub(r"[|:\[\]()ᴴᴰᴿᴬᵂ⁶⁰ᶠᵖˢᶜᶦᵗʸ/]", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def record_action(channel: dict, kind: str, stream: dict, reason: str, previous_primary: int | None):
    action = {
        "at": time.time(),
        "channel_id": channel["id"],
        "channel_name": channel["name"],
        "kind": kind,
        "stream_id": stream["stream_id"],
        "stream_name": stream["name"],
        "account": stream["account"],
        "replaced_stream_id": previous_primary,
        "reason": reason,
    }
    with lock:
        state["actions"] = ([action] + state["actions"])[:50]
        save_state()
    log(f"  ACTION {kind}: {channel['name']} -> [{stream['stream_id']}] {stream['name']} ({reason})")


def check_channel(channel: dict, account_names: dict[int, str], profile_to_account: dict[int, int]) -> str:
    order: list[int] = channel["streams"]
    streams = {s["id"]: s for s in api.streams_by_ids(order)}
    results: dict[int, dict] = {}
    skipped_busy = False

    for sid in order:
        s = streams.get(sid)
        if not s or not s.get("stream_hash"):
            continue
        busy = busy_accounts(profile_to_account)
        if s.get("m3u_account") in busy:
            skipped_busy = True
            continue
        results[sid] = probe_stream(s, account_names)

    primary = order[0] if order else None
    primary_result = results.get(primary) if primary else None
    status = primary_result["status"] if primary_result else ("busy" if skipped_busy else "unknown")
    _, live_streams = live_usage(profile_to_account)

    if not order:
        status = "fail"
    elif primary_result is None and live_streams.get(primary):
        # Someone is watching the primary right now and Dispatcharr says it's healthy
        status = "ok"
    elif primary_result is None and skipped_busy:
        # Primary's source is busy: judge by its same-named twin on another source, if probed
        twin = next(
            (r for r in results.values() if r["name"] == streams.get(primary, {}).get("name")), None
        )
        if twin:
            status = twin["status"]

    if AUTO_FIX and status == "fail":
        failed_names = {streams[sid]["name"] for sid, r in results.items() if r["status"] == "fail" and sid in streams}
        if primary_result is None and primary in streams:
            failed_names.add(streams[primary]["name"])  # twin failed, so the busy primary likely has too
        status = fix_channel(channel, order, results, failed_names, account_names, profile_to_account) or status

    with lock:
        state["channels"][str(channel["id"])] = {
            "channel_id": channel["id"],
            "name": channel["name"],
            "status": status,
            "primary_stream_id": api_primary(channel["id"], order),
            "checked_at": time.time(),
        }
        save_state()
    return status


def api_primary(channel_id: int, fallback: list[int]) -> int | None:
    try:
        ch = api.get(f"/api/channels/channels/{channel_id}/")
        return (ch.get("streams") or [None])[0]
    except Exception:
        return fallback[0] if fallback else None


def fix_channel(channel, order, results, failed_names, account_names, profile_to_account) -> str | None:
    primary = order[0]
    # 1. A passing stream already on the channel
    passing = sorted((r for sid, r in results.items() if r["status"] != "fail"), key=score, reverse=True)
    if passing:
        best = passing[0]
        new_order = [best["stream_id"]] + [s for s in order if s != best["stream_id"]]
        api.set_channel_streams(channel["id"], new_order)
        record_action(channel, "promoted", best, "primary stream failed", primary)
        return best["status"]

    # 2. Search for alternatives on free sources
    query = clean_name(channel["name"])
    seen = set(order)
    candidates = []
    for mode in ("phrase", "words"):
        for s in api.search_streams(query, mode=mode):
            if s["id"] in seen or s["name"] in failed_names or not s.get("stream_hash"):
                continue
            seen.add(s["id"])
            candidates.append(s)
        if len(candidates) >= MAX_CANDIDATES:
            break
    tested = []
    for s in candidates:
        if len(tested) >= MAX_CANDIDATES:
            break
        if s.get("m3u_account") in busy_accounts(profile_to_account):
            continue
        tested.append(probe_stream(s, account_names))
    good = sorted((r for r in tested if r["status"] != "fail"), key=score, reverse=True)
    if good:
        best = good[0]
        api.set_channel_streams(channel["id"], [best["stream_id"]] + order)
        record_action(channel, "added", best, f"all {len(results)} stream(s) on the channel failed", primary)
        return best["status"]
    log(f"  no working replacement found for {channel['name']} (tested {len(tested)})")
    return None


# --- Scan loop ------------------------------------------------------------------------


def target_channels() -> list[dict]:
    profiles = api.channel_profiles()
    profile = next((p for p in profiles if p["name"].lower() == PROFILE_NAME.lower()), None)
    if not profile:
        raise RuntimeError(f"channel profile {PROFILE_NAME!r} not found")
    members = set(profile["channels"])
    groups = api.groups()
    out = []
    for ch in api.channels():
        if ch["id"] not in members:
            continue
        if SKIP_AUTO_CREATED and ch.get("auto_created"):
            continue
        if groups.get(ch.get("channel_group_id"), "").lower() in EXCLUDE_GROUPS:
            continue
        out.append(ch)
    return sorted(out, key=lambda c: c.get("channel_number") or 0)


def run_scan(only_channel: int | None = None) -> bool:
    """Returns False if the scan couldn't run because every source was busy."""
    accounts = api.accounts()
    account_names = {a["id"]: a["name"] for a in accounts}
    profile_to_account = {p["id"]: a["id"] for a in accounts for p in a.get("profiles") or []}
    stream_accounts = {a["id"] for a in accounts if a.get("is_active")}

    if stream_accounts and stream_accounts <= busy_accounts(profile_to_account):
        log("every source is in use; postponing scan")
        return False

    channels = target_channels()
    if only_channel:
        channels = [c for c in channels if c["id"] == only_channel]
    log(f"scanning {len(channels)} channel(s)")
    set_status(running=True, phase="scanning", started_at=time.time(), progress=[0, len(channels)], last_error=None)
    for i, ch in enumerate(channels):
        set_status(current_channel=ch["name"], progress=[i, len(channels)])
        log(f"{ch.get('channel_number')} {ch['name']}")
        try:
            check_channel(ch, account_names, profile_to_account)
        except Exception as exc:
            log(f"  error: {exc}")
            traceback.print_exc()
    set_status(running=False, phase="idle", current_channel=None, progress=[len(channels), len(channels)], finished_at=time.time())
    return True


def scheduler():
    next_run = time.time() + 120  # first scan shortly after start
    while True:
        set_status(next_run=next_run)
        triggered = scan_requested.wait(timeout=max(0, next_run - time.time()))
        only = state["status"].pop("requested_channel", None) if triggered else None
        scan_requested.clear()
        try:
            ran = run_scan(only)
            next_run = time.time() + (INTERVAL_HOURS * 3600 if ran else BUSY_RETRY_MINUTES * 60)
            if not ran:
                set_status(phase="waiting: all sources in use")
        except Exception as exc:
            log(f"scan failed: {exc}")
            traceback.print_exc()
            set_status(running=False, phase="error", last_error=str(exc))
            next_run = time.time() + BUSY_RETRY_MINUTES * 60


# --- HTTP API (proxied by nginx at /m/health/) ----------------------------------------


class Handler(BaseHTTPRequestHandler):
    def _authorized(self) -> bool:
        return not SCANNER_TOKEN or self.headers.get("X-Scanner-Token") == SCANNER_TOKEN

    def _json(self, code: int, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self._authorized():
            return self._json(403, {"error": "forbidden"})
        if urlparse(self.path).path.rstrip("/") in ("", "/results"):
            with lock:
                body = {
                    "status": state["status"],
                    "settings": {"profile": PROFILE_NAME, "interval_hours": INTERVAL_HOURS, "auto_fix": AUTO_FIX},
                    # Thumbnails are internal (loop detection); keep the response small
                    "streams": {k: {kk: vv for kk, vv in v.items() if kk != "thumbs"} for k, v in state["streams"].items()},
                    "channels": state["channels"],
                    "actions": state["actions"],
                }
            return self._json(200, body)
        self._json(404, {"error": "not found"})

    def do_POST(self):
        if not self._authorized():
            return self._json(403, {"error": "forbidden"})
        url = urlparse(self.path)
        if url.path.rstrip("/") == "/scan":
            if state["status"].get("running"):
                return self._json(409, {"error": "a scan is already running"})
            channel = parse_qs(url.query).get("channel", [None])[0]
            if channel:
                state["status"]["requested_channel"] = int(channel)
            scan_requested.set()
            return self._json(202, {"queued": True})
        self._json(404, {"error": "not found"})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    threading.Thread(target=scheduler, daemon=True).start()
    log(f"health scanner up: profile={PROFILE_NAME} every {INTERVAL_HOURS}h auto_fix={AUTO_FIX}")
    ThreadingHTTPServer(("0.0.0.0", 9393), Handler).serve_forever()
