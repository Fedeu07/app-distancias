from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Base:
    id: str
    nombre: str
    lat: float
    lon: float


@dataclass(frozen=True)
class RouteResult:
    base: Base
    distance_m: float
    duration_s: float | None = None
