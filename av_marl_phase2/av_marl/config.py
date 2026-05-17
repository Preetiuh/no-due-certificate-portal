from __future__ import annotations

from dataclasses import asdict, dataclass, fields
import json
from pathlib import Path
from typing import Any


@dataclass
class ScenarioConfig:
    seed: int = 42
    max_steps: int = 140
    spawn_probability: float = 0.46
    initial_vehicles: int = 4
    max_active_agents: int = 9
    approach_length: float = 80.0
    intersection_exit: float = -22.0
    dt: float = 1.0
    max_speed: float = 12.0
    acceleration: float = 2.8
    brake_deceleration: float = 5.0
    safe_time_gap: float = 2.6
    near_miss_gap: float = 1.35
    communication_range: float = 95.0
    signal_cycle: int = 16
    route_distribution: dict[str, float] | None = None

    def __post_init__(self) -> None:
        if self.route_distribution is None:
            self.route_distribution = {"straight": 0.52, "right": 0.28, "left": 0.20}

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def load_config(path: str | Path | None = None) -> ScenarioConfig:
    if path is None:
        return ScenarioConfig()

    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)

    allowed = {field.name for field in fields(ScenarioConfig)}
    clean = {key: value for key, value in raw.items() if key in allowed}
    return ScenarioConfig(**clean)

