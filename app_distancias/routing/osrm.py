from __future__ import annotations

import httpx

from ..models import Base, RouteResult
from .base import RoutingError, RoutingProvider


class OSRMProvider(RoutingProvider):
    """
    OSRM público (router.project-osrm.org).

    Ventaja: gratis y sin API key.
    Limitación: servicio best-effort (no SLA) y puede rate-limitar.
    """

    name = "osrm"

    def __init__(self, base_url: str = "https://router.project-osrm.org") -> None:
        self.base_url = base_url.rstrip("/")

    def distances_from(
        self,
        origin_lat: float,
        origin_lon: float,
        bases: list[Base],
        profile: str,
    ) -> list[RouteResult]:
        if not bases:
            return []

        # OSRM espera lon,lat
        coords = [(origin_lon, origin_lat)] + [(b.lon, b.lat) for b in bases]
        coord_str = ";".join([f"{lon},{lat}" for lon, lat in coords])

        # Table: 1 origen (index 0) -> destinos (1..n)
        url = f"{self.base_url}/table/v1/{profile}/{coord_str}"
        params = {
            "sources": "0",
            "destinations": ";".join(str(i) for i in range(1, len(coords))),
            "annotations": "distance,duration",
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(url, params=params)
        except httpx.HTTPError as e:
            raise RoutingError(f"Error de red consultando OSRM: {e}") from e

        if resp.status_code != 200:
            raise RoutingError(f"OSRM respondió {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        distances = data.get("distances")
        durations = data.get("durations")

        if not distances or not isinstance(distances, list) or not distances[0]:
            raise RoutingError("Respuesta OSRM inválida: faltan distances.")

        row_d = distances[0]
        row_t = durations[0] if isinstance(durations, list) and durations else None

        results: list[RouteResult] = []
        for idx, b in enumerate(bases):
            d_m = row_d[idx]
            if d_m is None:
                # Sin ruta
                continue
            t_s = None if row_t is None else row_t[idx]
            results.append(
                RouteResult(
                    base=b,
                    distance_m=float(d_m),
                    duration_s=(None if t_s is None else float(t_s)),
                )
            )

        return results
