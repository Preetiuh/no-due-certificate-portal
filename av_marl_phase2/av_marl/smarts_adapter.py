from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class SmartsAdapterConfig:
    scenario_path: str
    headless: bool = True
    seed: int = 42


class SmartsIntersectionAdapter:
    """Adapter skeleton for connecting the Phase 2 agents to SMARTS.

    SMARTS is a heavy simulator dependency and is not installed in this local
    workspace. This class documents the integration boundary so the project can
    move from the lightweight demonstration environment to real SMARTS scenarios
    without rewriting the agent, reward, and evaluation layers.
    """

    def __init__(self, config: SmartsAdapterConfig):
        self.config = config
        try:
            from smarts.env.gymnasium.hiway_env_v1 import HiWayEnvV1  # type: ignore
        except Exception as exc:  # pragma: no cover - depends on optional simulator
            raise ImportError(
                "SMARTS is not installed. Install SMARTS and SUMO, then provide a SMARTS scenario path."
            ) from exc
        self._env_cls = HiWayEnvV1
        self.env: Any | None = None

    def reset(self) -> dict[str, Any]:
        if self.env is None:
            self.env = self._env_cls(
                scenarios=[self.config.scenario_path],
                headless=self.config.headless,
                seed=self.config.seed,
            )
        observations, _ = self.env.reset()
        return self._convert_observations(observations)

    def step(self, action_dict: dict[str, int]) -> tuple[dict[str, Any], dict[str, float], dict[str, bool], dict[str, Any]]:
        if self.env is None:
            raise RuntimeError("Call reset() before step().")
        smarts_actions = self._convert_actions(action_dict)
        observations, rewards, terminated, truncated, info = self.env.step(smarts_actions)
        dones = {agent_id: bool(terminated.get(agent_id, False) or truncated.get(agent_id, False)) for agent_id in rewards}
        dones["__all__"] = all(dones.values()) if dones else False
        return self._convert_observations(observations), rewards, dones, info

    @staticmethod
    def _convert_observations(observations: dict[str, Any]) -> dict[str, Any]:
        return observations

    @staticmethod
    def _convert_actions(action_dict: dict[str, int]) -> dict[str, Any]:
        action_map = {
            0: "slow_down",
            1: "keep_lane",
            2: "keep_lane",
            3: "accelerate",
        }
        return {agent_id: action_map.get(action, "keep_lane") for agent_id, action in action_dict.items()}

