from __future__ import annotations

import httpx

from ..models import Base, RouteResult
from .base import RoutingError, RoutingProvider


class ORSProvider(RoutingProvider):
    """
    OpenRouteService (requiere API key).

    Se deja como opción para quien prefiera un servicio con key y cuotas.
    """

    name = "ors"

    def __init__(
        self, api_key: str, base_url: str = "https://api.openrouteservice.org"
    ) -> None:
        self.api_key = api_key
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

        # ORS Matrix usa [lon,lat]
        locations = [[origin_lon, origin_lat]] + [[b.lon, b.lat] for b in bases]

        url = f"{self.base_url}/v2/matrix/{profile}"
        headers = {"Authorization": self.api_key, "Content-Type": "application/json"}
        payload = {
            "locations": locations,
            "sources": [0],
            "destinations": list(range(1, len(locations))),
            "metrics": ["distance", "duration"],
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, headers=headers, json=payload)
        except httpx.HTTPError as e:
            raise RoutingError(f"Error de red consultando ORS: {e}") from e

        if resp.status_code != 200:
            raise RoutingError(f"ORS respondió {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        distances = data.get("distances")
        durations = data.get("durations")

        if not distances or not isinstance(distances, list) or not distances[0]:
            raise RoutingError("Respuesta ORS inválida: faltan distances.")

        row_d = distances[0]
        row_t = durations[0] if isinstance(durations, list) and durations else None

        results: list[RouteResult] = []
        for idx, b in enumerate(bases):
            d_m = row_d[idx]
            if d_m is None:
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
