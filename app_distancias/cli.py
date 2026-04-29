from __future__ import annotations

import os
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from .cache import DistanceCache, default_cache_path
from .geo import round_coord
from .models import RouteResult
from .ranking import prefilter_by_haversine, top_n
from .routing.base import RoutingError
from .routing.ors import ORSProvider
from .routing.osrm import OSRMProvider
from .storage import BasesFileError, load_bases
from .utils import sha256_file

app = typer.Typer(add_completion=False, no_args_is_help=True)
console = Console()


def _format_km(meters: float) -> str:
    return f"{meters/1000:.2f} km"


def _format_min(seconds: float | None) -> str:
    if seconds is None:
        return "-"
    return f"{seconds/60:.1f} min"


def _offline_results(origin_lat: float, origin_lon: float, bases) -> list[RouteResult]:
    from .geo import haversine_m

    return [
        RouteResult(base=b, distance_m=haversine_m(origin_lat, origin_lon, b.lat, b.lon))
        for b in bases
    ]


def _provider_from_args(provider: str, ors_key: str | None) -> tuple[str, object]:
    provider = provider.lower().strip()
    if provider == "osrm":
        return "osrm", OSRMProvider()
    if provider == "ors":
        key = ors_key or os.getenv("ORS_API_KEY")
        if not key:
            raise typer.BadParameter(
                "Provider ORS requiere --ors-key o variable de entorno ORS_API_KEY."
            )
        return "ors", ORSProvider(api_key=key)
    raise typer.BadParameter("Provider inválido. Usá 'osrm' o 'ors'.")


@app.command("nearest")
def nearest(
    lat: float = typer.Option(..., help="Latitud del punto de consulta"),
    lon: float = typer.Option(..., help="Longitud del punto de consulta"),
    bases: Path = typer.Option(Path("data/bases.csv"), help="Archivo CSV/JSON de bases"),
    top: int = typer.Option(5, help="Cantidad de bases a listar"),
    provider: str = typer.Option("osrm", help="Proveedor: osrm | ors"),
    profile: str = typer.Option("driving", help="Perfil de ruteo (osrm: driving)"),
    prefilter_k: int = typer.Option(0, help="Prefiltro Haversine (0 = desactivado)"),
    offline: bool = typer.Option(False, help="Modo offline: usa línea recta (aproximado)"),
    cache_db: Path = typer.Option(default_cache_path(), help="Ruta a SQLite de caché"),
    cache_ttl_days: int = typer.Option(30, help="TTL del caché (días)"),
    ors_key: str | None = typer.Option(None, help="API key ORS (o env ORS_API_KEY)"),
):
    """
    Lista las bases más cercanas desde un punto (lat/lon).

    Por defecto usa OSRM Table (gratis) para distancia por ruta real.
    """
    try:
        all_bases = load_bases(bases)
    except BasesFileError as e:
        raise typer.BadParameter(str(e)) from e

    selected_bases = (
        prefilter_by_haversine(lat, lon, all_bases, prefilter_k)
        if prefilter_k
        else all_bases
    )

    bases_hash = sha256_file(bases)
    cache = DistanceCache(cache_db, ttl_seconds=cache_ttl_days * 24 * 3600)

    origin_key = f"{round_coord(lat)}:{round_coord(lon)}"

    if offline:
        results = _offline_results(lat, lon, selected_bases)
    else:
        provider_name, prov = _provider_from_args(provider, ors_key)
        cache_key = f"{provider_name}:{profile}:{origin_key}:{bases_hash}:{len(selected_bases)}"
        cached = cache.get(cache_key)
        if cached is not None:
            results = cached
        else:
            try:
                results = prov.distances_from(lat, lon, selected_bases, profile)  # type: ignore[attr-defined]
            except RoutingError as e:
                raise typer.BadParameter(str(e)) from e
            cache.set(cache_key, results)

    final = top_n(results, top)
    if not final:
        console.print("[bold red]No se pudieron calcular rutas para ninguna base.[/bold red]")
        raise typer.Exit(code=2)

    title = "Top bases más cercanas"
    if offline:
        title += " (OFFLINE: aproximado)"

    table = Table(title=title, show_lines=False)
    table.add_column("#", justify="right")
    table.add_column("id", style="cyan")
    table.add_column("nombre")
    table.add_column("distancia")
    table.add_column("duración")

    for i, r in enumerate(final, start=1):
        table.add_row(
            str(i),
            r.base.id,
            r.base.nombre,
            _format_km(r.distance_m),
            _format_min(r.duration_s),
        )

    console.print(table)
