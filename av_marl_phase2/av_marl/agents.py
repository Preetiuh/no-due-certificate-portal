from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
import json
from pathlib import Path
import random
from typing import Any

import numpy as np

from .environment import ACTION_BRAKE, ACTION_CRUISE, ACTION_GO, ACTION_HOLD, ACTION_NAMES


class BasePolicy:
    name = "base"

    def select_actions(self, env: Any, observations: dict[str, np.ndarray], explore: bool = False) -> dict[str, int]:
        raise NotImplementedError

    def learn(
        self,
        observations: dict[str, np.ndarray],
        actions: dict[str, int],
        rewards: dict[str, float],
        next_observations: dict[str, np.ndarray],
        dones: dict[str, bool],
    ) -> None:
        return None


class GreedyNoCommunicationPolicy(BasePolicy):
    name = "no_comm_greedy"

    def select_actions(self, env: Any, observations: dict[str, np.ndarray], explore: bool = False) -> dict[str, int]:
        actions = {}
        for agent_id, obs in observations.items():
            distance_norm, speed_norm = float(obs[0]), float(obs[1])
            if distance_norm < 0.12 and speed_norm > 0.62:
                actions[agent_id] = ACTION_CRUISE
            else:
                actions[agent_id] = ACTION_GO
        return actions


class TrafficSignalPolicy(BasePolicy):
    name = "fixed_signal"

    def select_actions(self, env: Any, observations: dict[str, np.ndarray], explore: bool = False) -> dict[str, int]:
        half_cycle = max(env.config.signal_cycle // 2, 1)
        green_axis = 0 if (env.step_count // half_cycle) % 2 == 0 else 1
        actions = {}
        for agent_id, packet in env.intent_packets().items():
            axis = packet["approach"] % 2
            close = packet["distance"] < 24
            if axis == green_axis:
                actions[agent_id] = ACTION_GO if close else ACTION_CRUISE
            else:
                actions[agent_id] = ACTION_BRAKE if close else ACTION_CRUISE
        return actions


class V2VPriorityPolicy(BasePolicy):
    name = "v2v_priority_shield"

    def select_actions(self, env: Any, observations: dict[str, np.ndarray], explore: bool = False) -> dict[str, int]:
        packets = env.intent_packets()
        actions: dict[str, int] = {}
        for agent_id, packet in packets.items():
            if packet["distance"] > 30:
                actions[agent_id] = ACTION_CRUISE
                continue

            vehicle = env.vehicles[agent_id]
            if env._has_priority(vehicle):
                actions[agent_id] = ACTION_GO
            else:
                gap = self._closest_conflict_gap(env, agent_id)
                actions[agent_id] = ACTION_BRAKE if gap < env.config.safe_time_gap else ACTION_HOLD
        return actions

    @staticmethod
    def _closest_conflict_gap(env: Any, agent_id: str) -> float:
        vehicle = env.vehicles[agent_id]
        closest = float("inf")
        for other_id, other in env.vehicles.items():
            if other_id == agent_id or not other.active:
                continue
            if env._movements_conflict(vehicle, other):
                closest = min(closest, abs(vehicle.eta - other.eta))
        return closest


@dataclass
class QLearningConfig:
    alpha: float = 0.18
    gamma: float = 0.92
    epsilon: float = 0.22
    epsilon_min: float = 0.03
    epsilon_decay: float = 0.992
    shield: bool = True


class TabularMARLPolicy(BasePolicy):
    name = "shared_q_learning"

    def __init__(self, config: QLearningConfig | None = None, seed: int = 7):
        self.config = config or QLearningConfig()
        self.rng = random.Random(seed)
        self.q_table: dict[tuple[int, ...], np.ndarray] = defaultdict(self._initial_q_values)

    @property
    def epsilon(self) -> float:
        return self.config.epsilon

    def decay_epsilon(self) -> None:
        self.config.epsilon = max(self.config.epsilon_min, self.config.epsilon * self.config.epsilon_decay)

    def select_actions(self, env: Any, observations: dict[str, np.ndarray], explore: bool = False) -> dict[str, int]:
        actions: dict[str, int] = {}
        for agent_id, obs in observations.items():
            state = self._state_key(obs)
            if explore and self.rng.random() < self.config.epsilon:
                action = self.rng.randrange(len(ACTION_NAMES))
            else:
                action = int(np.argmax(self.q_table[state]))

            if self.config.shield:
                action = self._shield_action(env, agent_id, action)
            actions[agent_id] = action
        return actions

    def learn(
        self,
        observations: dict[str, np.ndarray],
        actions: dict[str, int],
        rewards: dict[str, float],
        next_observations: dict[str, np.ndarray],
        dones: dict[str, bool],
    ) -> None:
        for agent_id, action in actions.items():
            if agent_id not in observations or agent_id not in rewards:
                continue
            state = self._state_key(observations[agent_id])
            old_value = self.q_table[state][action]
            if dones.get(agent_id, False) or agent_id not in next_observations:
                bootstrap = 0.0
            else:
                next_state = self._state_key(next_observations[agent_id])
                bootstrap = float(np.max(self.q_table[next_state]))
            target = rewards[agent_id] + self.config.gamma * bootstrap
            self.q_table[state][action] = old_value + self.config.alpha * (target - old_value)

    def save(self, path: str | Path) -> None:
        serializable = {"|".join(map(str, key)): values.tolist() for key, values in self.q_table.items()}
        with Path(path).open("w", encoding="utf-8") as handle:
            json.dump(serializable, handle, indent=2)

    def load(self, path: str | Path) -> None:
        with Path(path).open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
        self.q_table.clear()
        for key, values in raw.items():
            self.q_table[tuple(int(part) for part in key.split("|"))] = np.array(values, dtype=np.float64)

    @staticmethod
    def _state_key(obs: np.ndarray) -> tuple[int, ...]:
        distance_bin = int(np.digitize(obs[0], [-0.05, 0.08, 0.18, 0.36, 0.65, 0.95]))
        speed_bin = int(np.digitize(obs[1], [0.05, 0.25, 0.45, 0.7, 0.9]))
        approach_bin = int(round(float(obs[2]) * 3))
        route_bin = int(round(float(obs[3]) * 2))
        eta_bin = int(np.digitize(obs[4], [0.12, 0.25, 0.5, 0.8]))
        queue_bin = int(np.digitize(obs[5], [0.1, 0.35, 0.65]))
        risk_bin = int(np.digitize(obs[6], [0.18, 0.42, 0.75]))
        priority = int(obs[7] > 0.5)
        return (distance_bin, speed_bin, approach_bin, route_bin, eta_bin, queue_bin, risk_bin, priority)

    @staticmethod
    def _initial_q_values() -> np.ndarray:
        values = np.zeros(len(ACTION_NAMES), dtype=np.float64)
        values[ACTION_CRUISE] = 0.12
        values[ACTION_GO] = 0.16
        return values

    @staticmethod
    def _shield_action(env: Any, agent_id: str, action: int) -> int:
        if action not in (ACTION_CRUISE, ACTION_GO) or agent_id not in env.vehicles:
            return action
        vehicle = env.vehicles[agent_id]
        if vehicle.distance > 24:
            return action
        if env._has_priority(vehicle):
            return action
        return ACTION_BRAKE
