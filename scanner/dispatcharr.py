"""Minimal Dispatcharr API client (API-key auth)."""

import json
import urllib.parse
import urllib.request


class Dispatcharr:
    def __init__(self, base_url: str, api_key: str):
        self.base = base_url.rstrip("/")
        self.api_key = api_key

    def _request(self, method: str, path: str, body=None, query: dict | None = None):
        url = self.base + path
        if query:
            url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("X-API-Key", self.api_key)
        req.add_header("Accept", "application/json")
        if data is not None:
            req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
        return json.loads(raw) if raw else None

    def get(self, path, **query):
        return self._request("GET", path, query=query)

    def channel_profiles(self) -> list[dict]:
        return self.get("/api/channels/profiles/")

    def channels(self) -> list[dict]:
        out, page = [], 1
        while True:
            data = self.get("/api/channels/channels/", page=page, page_size=250)
            out += data["results"]
            if not data.get("next"):
                return out
            page += 1

    def groups(self) -> dict[int, str]:
        return {g["id"]: g["name"] for g in self.get("/api/channels/groups/")}

    def streams_by_ids(self, ids: list[int]) -> list[dict]:
        return self._request("POST", "/api/channels/streams/by-ids/", body={"ids": ids}) if ids else []

    def search_streams(self, name: str, mode: str = "phrase", limit: int = 25) -> list[dict]:
        key = "name" if mode == "phrase" else "search"
        return self.get("/api/channels/streams/", **{key: name, "page_size": limit})["results"]

    def accounts(self) -> list[dict]:
        return self.get("/api/m3u/accounts/")

    def proxy_status(self) -> list[dict]:
        return self.get("/proxy/ts/status").get("channels") or []

    def set_channel_streams(self, channel_id: int, stream_ids: list[int]) -> dict:
        return self._request("PATCH", f"/api/channels/channels/{channel_id}/", body={"streams": stream_ids})

    def preview_url(self, stream_hash: str) -> str:
        return f"{self.base}/proxy/ts/stream/{stream_hash}"
