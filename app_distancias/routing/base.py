from __future__ import annotations

from abc import ABC, abstractmethod

from ..models import Base, RouteResult


class RoutingError(RuntimeError):
    pass


class RoutingProvider(ABC):
    name: str

    @abstractmethod
    def distances_from(
        self,
        origin_lat: float,
        origin_lon: float,
        bases: list[Base],
        profile: str,
    ) -> list[RouteResult]:
        raise NotImplementedError
