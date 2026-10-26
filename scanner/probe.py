"""Sample a live stream with one ffmpeg run and judge its health.

The video is copied (not decoded) to count frames, measure bitrate and catch stalls or
timestamp jumps. Only keyframes are decoded, shrunk to 32x18 grey thumbnails, which is
enough to spot frozen, black or looping pictures. Audio is decoded only to detect silence.
That keeps one probe to a few percent of a CPU core, even for 4K HEVC.
"""

import re
import subprocess
import time

THUMB_W, THUMB_H = 32, 18
THUMB_SIZE = THUMB_W * THUMB_H

STREAM_INFO = re.compile(r"Stream #0:\d+.*?: Video: (\w+).*?, (\d{2,5})x(\d{2,5})")
DECLARED_FPS = re.compile(r"(\d+(?:\.\d+)?) fps")
STATS = re.compile(r"frame=\s*(\d+).*?time=(\d+):(\d+):(\d+(?:\.\d+)?).*?bitrate=\s*([\d.]+|N/A)")
DISCONTINUITY = re.compile(r"timestamp discontinuity|Non-monoton|DTS out of order|Packet corrupt", re.I)
SILENCE = re.compile(r"silence_duration: ([\d.]+)")


def run_ffmpeg(url: str, seconds: int, headers: dict | None, user_agent: str | None = None) -> tuple[bytes, str, float]:
    cmd = ["ffmpeg", "-y", "-hide_banner", "-nostdin", "-loglevel", "info"]
    if "://" in url:
        cmd += ["-rw_timeout", "15000000"]
    if user_agent:
        cmd += ["-user_agent", user_agent]
    if headers:
        cmd += ["-headers", "".join(f"{k}: {v}\r\n" for k, v in headers.items())]
    cmd += [
        "-skip_frame", "nokey",
        # Real-time reading after an 8s startup burst, so a provider that can't keep up shows as a stall
        "-readrate", "1", "-readrate_initial_burst", "8",
        # Limit on the input: per-output limits make ffmpeg wait for the slowest output
        "-t", str(seconds),
        "-i", url,
        # 1: video copy, for frame count / bitrate / timing (first output drives the stats line)
        "-map", "0:v:0", "-c", "copy", "-f", "mpegts", "/dev/null",
        # 2: keyframe thumbnails for freeze / black / loop checks
        "-map", "0:v:0", "-vf", f"scale={THUMB_W}:{THUMB_H}:flags=area,format=gray",
        "-fps_mode", "passthrough", "-f", "rawvideo", "pipe:1",
        # 3: audio silence
        "-map", "0:a:0?", "-af", "silencedetect=n=-50dB:d=8", "-f", "null", "-",
    ]
    started = time.monotonic()
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=seconds * 3 + 30)
        out, err = proc.stdout, proc.stderr.decode("utf-8", "replace")
    except subprocess.TimeoutExpired as exc:
        out, err = exc.stdout or b"", (exc.stderr or b"").decode("utf-8", "replace") + "\n[probe timeout]"
    return out, err, time.monotonic() - started


def mad(a: bytes, b: bytes) -> float:
    """Mean absolute difference between two thumbnails (0-255)."""
    return sum(abs(x - y) for x, y in zip(a, b)) / THUMB_SIZE


def short_loop_period(thumbs: list[bytes]) -> int | None:
    """Smallest keyframe lag at which the picture repeats, if the sample loops.

    A lag counts when keyframes that far apart are nearly identical (median) and far more
    alike than neighbouring keyframes; a few mismatches at the loop's seam are tolerated.
    """
    n = len(thumbs)
    neighbour = sum(mad(a, b) for a, b in zip(thumbs, thumbs[1:])) / (n - 1)
    for lag in range(2, n // 2 + 1):
        pairs = sorted(mad(thumbs[i], thumbs[i + lag]) for i in range(n - lag))
        median = pairs[len(pairs) // 2]
        if median < 3 and sum(pairs) / len(pairs) < neighbour * 0.25:
            return lag
    return None


def probe(url: str, seconds: int = 25, headers: dict | None = None, user_agent: str | None = None) -> dict:
    out, err, wall = run_ffmpeg(url, seconds, headers, user_agent)
    thumbs = [out[i : i + THUMB_SIZE] for i in range(0, len(out) - THUMB_SIZE + 1, THUMB_SIZE)]

    m: dict = {"wall_seconds": round(wall, 1), "keyframes": len(thumbs)}
    info = STREAM_INFO.search(err)
    if info:
        m["codec"] = info.group(1)
        m["resolution"] = f"{info.group(2)}x{info.group(3)}"
        m["height"] = int(info.group(3))
        line = err[info.start() : err.find("\n", info.start())]
        fps = DECLARED_FPS.search(line)
        if fps:
            m["declared_fps"] = float(fps.group(1))

    stats = STATS.findall(err)
    if stats:
        frames, hh, mm, ss, bitrate = stats[-1]
        media = int(hh) * 3600 + int(mm) * 60 + float(ss)
        # The last stats line lags the true end; a sample that ran (nearly) full length is `seconds` long
        if media >= seconds * 0.85:
            media = float(seconds)
        m["frames"] = int(frames)
        m["media_seconds"] = round(media, 1)
        if media > 1:
            m["fps"] = round(int(frames) / media, 1)
        if bitrate != "N/A":
            m["kbps"] = round(float(bitrate))

    m["discontinuities"] = len(DISCONTINUITY.findall(err))

    # silencedetect closes any open silence at the end of the sample, so total the durations
    silent = sum(float(x) for x in SILENCE.findall(err))
    if silent:
        m["silent_seconds"] = round(silent, 1)

    if len(thumbs) >= 2:
        diffs = [mad(a, b) for a, b in zip(thumbs, thumbs[1:])]
        m["motion"] = round(sum(diffs) / len(diffs), 2)
        m["brightness"] = round(sum(sum(t) / THUMB_SIZE for t in thumbs) / len(thumbs), 1)
        # Only a busy picture can "loop": near-static content trivially repeats
        if len(thumbs) >= 6 and m["motion"] > 8:
            m["loop_period_keyframes"] = short_loop_period(thumbs)

    status, issues = judge(m, seconds, err)
    return {"status": status, "issues": issues, "metrics": m, "thumbs": [t.hex() for t in thumbs[:40]]}


def judge(m: dict, seconds: int, err: str) -> tuple[str, list[str]]:
    """'fail' problems trigger auto-fixing; 'warn' problems are only shown."""
    fail: list[str] = []
    warn: list[str] = []
    media = m.get("media_seconds", 0)

    if not m.get("frames") or media < 3:
        reason = "no video received"
        if "[probe timeout]" in err:
            reason = "timed out with no video"
        elif re.search(r"HTTP error|Server returned|Connection refused|404|403", err):
            reason = "source refused the connection"
        return "fail", [reason]

    if media < seconds * 0.6:
        fail.append(f"stream stopped after {media:.0f}s")
    # Live streams arrive in real time; much slower means buffering on the viewer side
    if media > 5 and m["wall_seconds"] > media * 1.35 + 8:
        fail.append(f"stalling ({media:.0f}s of video took {m['wall_seconds']:.0f}s)")

    fps, declared = m.get("fps"), m.get("declared_fps")
    if fps is not None:
        if fps < 15:
            fail.append(f"low frame rate ({fps} fps)")
        elif declared and declared >= 24 and fps < declared * 0.8:
            fail.append(f"dropping frames ({fps} of {declared:g} fps)")
        elif declared and fps < declared * 0.95:
            warn.append(f"some dropped frames ({fps} of {declared:g} fps)")

    if m.get("keyframes", 0) >= 3:
        if m.get("brightness", 255) < 10:
            fail.append("black picture")
        elif m.get("motion", 99) < 0.6:
            fail.append("frozen picture or static slate")
    elif media >= 15:
        warn.append("few keyframes (slow to start or seek)")

    if m.get("loop_period_keyframes"):
        fail.append("picture is looping")

    if media and m.get("silent_seconds", 0) >= media * 0.6:
        warn.append("no audio")

    if m.get("discontinuities", 0) >= 3:
        warn.append(f"{m['discontinuities']} timestamp jumps (can break Plex)")

    kbps, height = m.get("kbps"), m.get("height", 0)
    if kbps:
        floor = 3500 if height >= 1500 else 1500 if height >= 1000 else 1000 if height >= 700 else 500
        if kbps < floor * 0.5:
            fail.append(f"very low bitrate ({kbps} kbps for {m.get('resolution')})")
        elif kbps < floor:
            warn.append(f"low bitrate ({kbps} kbps for {m.get('resolution')})")

    if fail:
        return "fail", fail + warn
    return ("warn" if warn else "ok"), warn
