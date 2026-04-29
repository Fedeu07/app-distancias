from __future__ import annotations

import csv
import json
from pathlib import Path

from .models import Base


class BasesFileError(RuntimeError):
    pass


def _parse_float(value: str, field_name: str, base_id: str) -> float:
    try:
        value = value.strip().replace(",", ".")
        return float(value)
    except Exception as e:  # noqa: BLE001
        raise BasesFileError(
            f"Base '{base_id}': campo '{field_name}' inválido: {value!r}"
        ) from e


def _validate_lat_lon(lat: float, lon: float, base_id: str) -> None:
    if not (-90.0 <= lat <= 90.0):
        raise BasesFileError(f"Base '{base_id}': lat fuera de rango: {lat}")
    if not (-180.0 <= lon <= 180.0):
        raise BasesFileError(f"Base '{base_id}': lon fuera de rango: {lon}")


def load_bases(path: str | Path) -> list[Base]:
    p = Path(path)
    if not p.exists():
        raise BasesFileError(f"No existe el archivo de bases: {p}")

    suffix = p.suffix.lower()
    if suffix == ".csv":
        bases = _load_bases_csv(p)
    elif suffix == ".json":
        bases = _load_bases_json(p)
    else:
        raise BasesFileError("Formato no soportado. Usá .csv o .json.")

    if not bases:
        raise BasesFileError("El archivo de bases no contiene registros.")

    seen: set[str] = set()
    for b in bases:
        if b.id in seen:
            raise BasesFileError(f"id duplicado en bases: {b.id}")
        seen.add(b.id)

    return bases


def _load_bases_csv(path: Path) -> list[Base]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"id", "nombre", "lat", "lon"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise BasesFileError(
                f"CSV inválido. Faltan columnas: {', '.join(sorted(missing))}"
            )

        out: list[Base] = []
        for row in reader:
            base_id = (row.get("id") or "").strip()
            nombre = (row.get("nombre") or "").strip()
            if not base_id:
                raise BasesFileError("Hay una fila sin 'id'.")
            if not nombre:
                raise BasesFileError(f"Base '{base_id}': 'nombre' vacío.")
            lat = _parse_float(row.get("lat") or "", "lat", base_id)
            lon = _parse_float(row.get("lon") or "", "lon", base_id)
            _validate_lat_lon(lat, lon, base_id)
            out.append(Base(id=base_id, nombre=nombre, lat=lat, lon=lon))

    return out


def _load_bases_json(path: Path) -> list[Base]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise BasesFileError("JSON inválido: se esperaba una lista de bases.")

    out: list[Base] = []
    for item in data:
        if not isinstance(item, dict):
            raise BasesFileError("JSON inválido: cada base debe ser un objeto.")
        base_id = str(item.get("id", "")).strip()
        nombre = str(item.get("nombre", "")).strip()
        if not base_id:
            raise BasesFileError("Hay un objeto sin 'id'.")
        if not nombre:
            raise BasesFileError(f"Base '{base_id}': 'nombre' vacío.")
        lat = float(item.get("lat"))
        lon = float(item.get("lon"))
        _validate_lat_lon(lat, lon, base_id)
        out.append(Base(id=base_id, nombre=nombre, lat=lat, lon=lon))

    return out
