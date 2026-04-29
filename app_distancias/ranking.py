from __future__ import annotations

from .geo import haversine_m
from .models import Base, RouteResult


def prefilter_by_haversine(
    origin_lat: float,
    origin_lon: float,
    bases: list[Base],
    k: int,
) -> list[Base]:
    if k <= 0 or k >= len(bases):
        return list(bases)

    scored = [(haversine_m(origin_lat, origin_lon, b.lat, b.lon), b) for b in bases]
    scored.sort(key=lambda t: t[0])
    return [b for _, b in scored[:k]]


def top_n(results: list[RouteResult], n: int) -> list[RouteResult]:
    if n <= 0:
        return []
    return sorted(results, key=lambda r: r.distance_m)[:n]
