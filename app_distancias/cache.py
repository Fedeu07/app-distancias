from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import asdict
from pathlib import Path

from .models import RouteResult


def default_cache_path() -> Path:
    return Path(".cache") / "distancias.sqlite3"


class DistanceCache:
    def __init__(self, db_path: Path, ttl_seconds: int = 30 * 24 * 3600) -> None:
        self.db_path = db_path
        self.ttl_seconds = ttl_seconds
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS route_cache (
                  cache_key TEXT PRIMARY KEY,
                  created_at INTEGER NOT NULL,
                  payload_json TEXT NOT NULL
                )
                """
            )

    def get(self, cache_key: str) -> list[RouteResult] | None:
        now = int(time.time())
        with self._connect() as conn:
            row = conn.execute(
                "SELECT created_at, payload_json FROM route_cache WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()

        if not row:
            return None
        created_at, payload_json = int(row[0]), str(row[1])
        if now - created_at > self.ttl_seconds:
            self.delete(cache_key)
            return None

        data = json.loads(payload_json)
        return [_route_result_from_dict(item) for item in data]

    def set(self, cache_key: str, results: list[RouteResult]) -> None:
        now = int(time.time())
        payload_json = json.dumps(
            [_route_result_to_dict(r) for r in results], ensure_ascii=False
        )
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO route_cache(cache_key, created_at, payload_json)
                VALUES(?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                  created_at=excluded.created_at,
                  payload_json=excluded.payload_json
                """,
                (cache_key, now, payload_json),
            )

    def delete(self, cache_key: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM route_cache WHERE cache_key = ?", (cache_key,))


def _route_result_to_dict(r: RouteResult) -> dict:
    d = asdict(r)
    d["base"] = asdict(r.base)
    return d


def _route_result_from_dict(d: dict) -> RouteResult:
    base_d = d["base"]
    from .models import Base  # local import to avoid cycles

    base = Base(
        id=base_d["id"],
        nombre=base_d["nombre"],
        lat=float(base_d["lat"]),
        lon=float(base_d["lon"]),
    )
    return RouteResult(
        base=base,
        distance_m=float(d["distance_m"]),
        duration_s=(None if d.get("duration_s") is None else float(d["duration_s"])),
    )
