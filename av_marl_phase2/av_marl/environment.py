from __future__ import annotations

from dataclasses import dataclass, field
import math
import random
from typing import Any

import numpy as np

from .config import ScenarioConfig


ACTION_BRAKE = 0
ACTION_HOLD = 1
ACTION_CRUISE = 2
ACTION_GO = 3

ACTION_NAMES = {
    ACTION_BRAKE: "brake",
    ACTION_HOLD: "hold",
    ACTION_CRUISE: "cruise",
    ACTION_GO: "go",
}

ROUTES = ("straight", "right", "left")
APPROACHES = ("north", "east", "south", "west")


@dataclass
class Vehicle:
    agent_id: str
    approach: int
    route: str
    distance: float
    speed: float
    spawn_step: int
    priority_stamp: int
    last_distance: float = field(init=False)
    completed: bool = False
    crashed: bool = False
    wait_time: int = 0
    near_misses: int = 0
    total_reward: float = 0.0
    entered_intersection: bool = False
    completed_step: int | None = None

    def __post_init__(self) -> None:
        self.last_distance = self.distance

    @property
    def active(self) -> bool:
        return not self.completed and not self.crashed

    @property
    def eta(self) -> float:
        if self.distance <= 0:
            return 0.0
        return self.distance / max(self.speed, 0.75)


class MultiAgentIntersectionEnv:
    """A small MACAD-Gym-style multi-agent intersection environment.

    The environment returns dictionaries keyed by agent id:
    observations, rewards, dones, and info. That keeps the Phase 2 prototype
    close to the sample project's working pattern while avoiding simulator
    dependencies during classroom evaluation.
    """

    def __init__(self, config: ScenarioConfig | None = None):
        self.config = config or ScenarioConfig()
        self.rng = random.Random(self.config.seed)
        self.np_rng = np.random.default_rng(self.config.seed)
        self.step_count = 0
        self.agent_counter = 0
        self.priority_counter = 0
        self.vehicles: dict[str, Vehicle] = {}
        self.metrics: dict[str, float] = {}
        self.trace: list[dict[str, Any]] = []

    def reset(self, seed: int | None = None) -> dict[str, np.ndarray]:
        if seed is not None:
            self.rng = random.Random(seed)
            self.np_rng = np.random.default_rng(seed)
        self.step_count = 0
        self.agent_counter = 0
        self.priority_counter = 0
        self.vehicles = {}
        self.trace = []
        self.metrics = {
            "spawned": 0,
            "completed": 0,
            "collisions": 0,
            "near_misses": 0,
            "total_wait": 0,
            "total_reward": 0.0,
            "travel_time_sum": 0.0,
            "speed_sum": 0.0,
            "speed_samples": 0,
            "cooperative_yields": 0,
        }

        for approach in range(min(self.config.initial_vehicles, 4)):
            self._spawn_vehicle(approach=approach, distance=self.config.approach_length - 8 * approach)

        return self._observations()

    def step(
        self, action_dict: dict[str, int]
    ) -> tuple[dict[str, np.ndarray], dict[str, float], dict[str, bool], dict[str, dict[str, Any]]]:
        self.step_count += 1
        rewards: dict[str, float] = {}
        infos: dict[str, dict[str, Any]] = {}
        dones: dict[str, bool] = {}
        active_ids = [agent_id for agent_id, vehicle in self.vehicles.items() if vehicle.active]

        for vehicle in self.vehicles.values():
            vehicle.last_distance = vehicle.distance

        risky_before = self._risk_map()

        for agent_id in active_ids:
            vehicle = self.vehicles[agent_id]
            action = int(action_dict.get(agent_id, ACTION_HOLD))
            action = action if action in ACTION_NAMES else ACTION_HOLD
            if action in (ACTION_BRAKE, ACTION_HOLD) and risky_before.get(agent_id, 99.0) < self.config.safe_time_gap:
                self.metrics["cooperative_yields"] += 1
            self._apply_action(vehicle, action)

        self._move_vehicles()
        collided = self._detect_collisions()
        near_miss_agents = self._detect_near_misses()
        self._complete_finished_agents()

        for agent_id in active_ids:
            vehicle = self.vehicles[agent_id]
            reward = self._reward(vehicle, agent_id in collided, agent_id in near_miss_agents)
            vehicle.total_reward += reward
            self.metrics["total_reward"] += reward
            rewards[agent_id] = reward
            dones[agent_id] = vehicle.completed or vehicle.crashed
            infos[agent_id] = {
                "action": ACTION_NAMES.get(int(action_dict.get(agent_id, ACTION_HOLD)), "hold"),
                "eta": vehicle.eta,
                "route": vehicle.route,
                "approach": APPROACHES[vehicle.approach],
                "completed": vehicle.completed,
                "crashed": vehicle.crashed,
                "near_miss": agent_id in near_miss_agents,
                "risk_gap": risky_before.get(agent_id, math.inf),
            }

        self._maybe_spawn()
        self._record_trace()

        all_done = self.step_count >= self.config.max_steps
        dones["__all__"] = all_done
        return self._observations(), rewards, dones, infos

    def close(self) -> None:
        self.vehicles.clear()

    def intent_packets(self) -> dict[str, dict[str, Any]]:
        packets = {}
        for agent_id, vehicle in self.vehicles.items():
            if not vehicle.active:
                continue
            packets[agent_id] = {
                "approach": vehicle.approach,
                "approach_name": APPROACHES[vehicle.approach],
                "route": vehicle.route,
                "distance": vehicle.distance,
                "speed": vehicle.speed,
                "eta": vehicle.eta,
                "priority_stamp": vehicle.priority_stamp,
            }
        return packets

    def get_metrics(self) -> dict[str, float]:
        completed = max(self.metrics["completed"], 1)
        spawned = max(self.metrics["spawned"], 1)
        speed_samples = max(self.metrics["speed_samples"], 1)
        return {
            "spawned": self.metrics["spawned"],
            "completed": self.metrics["completed"],
            "completion_rate": self.metrics["completed"] / spawned,
            "collisions": self.metrics["collisions"],
            "near_misses": self.metrics["near_misses"],
            "avg_wait": self.metrics["total_wait"] / spawned,
            "avg_reward": self.metrics["total_reward"] / spawned,
            "avg_travel_time": self.metrics["travel_time_sum"] / completed,
            "avg_speed": self.metrics["speed_sum"] / speed_samples,
            "throughput": self.metrics["completed"] / max(self.step_count, 1),
            "cooperative_yields": self.metrics["cooperative_yields"],
        }

    def _spawn_vehicle(self, approach: int | None = None, distance: float | None = None) -> None:
        if len([vehicle for vehicle in self.vehicles.values() if vehicle.active]) >= self.config.max_active_agents:
            return

        route_distribution = self.config.route_distribution or {"straight": 1.0}
        routes = list(route_distribution.keys())
        weights = list(route_distribution.values())
        route = self.rng.choices(routes, weights=weights, k=1)[0]
        approach_value = self.rng.randrange(4) if approach is None else approach
        distance_value = self.config.approach_length if distance is None else distance
        speed = self.rng.uniform(2.5, 5.5)
        agent_id = f"car_{self.agent_counter:03d}"
        self.agent_counter += 1
        self.priority_counter += 1
        self.vehicles[agent_id] = Vehicle(
            agent_id=agent_id,
            approach=approach_value,
            route=route,
            distance=distance_value,
            speed=speed,
            spawn_step=self.step_count,
            priority_stamp=self.priority_counter,
        )
        self.metrics["spawned"] += 1

    def _maybe_spawn(self) -> None:
        active_count = len([vehicle for vehicle in self.vehicles.values() if vehicle.active])
        if active_count >= self.config.max_active_agents:
            return
        if self.rng.random() > self.config.spawn_probability:
            return
        approach = self.rng.randrange(4)
        same_lane = [
            vehicle.distance
            for vehicle in self.vehicles.values()
            if vehicle.active and vehicle.approach == approach and vehicle.distance > 48
        ]
        if same_lane:
            return
        self._spawn_vehicle(approach=approach)

    def _apply_action(self, vehicle: Vehicle, action: int) -> None:
        if action == ACTION_BRAKE:
            vehicle.speed = max(0.0, vehicle.speed - self.config.brake_deceleration * self.config.dt)
        elif action == ACTION_HOLD:
            vehicle.speed = max(0.0, vehicle.speed - 0.45 * self.config.brake_deceleration * self.config.dt)
        elif action == ACTION_CRUISE:
            target = 0.58 * self.config.max_speed
            vehicle.speed += np.clip(target - vehicle.speed, -1.2, 1.2)
        elif action == ACTION_GO:
            vehicle.speed = min(self.config.max_speed, vehicle.speed + self.config.acceleration * self.config.dt)

    def _move_vehicles(self) -> None:
        for vehicle in self.vehicles.values():
            if not vehicle.active:
                continue
            vehicle.distance -= vehicle.speed * self.config.dt
            if vehicle.speed < 0.5 and vehicle.distance > self.config.intersection_exit:
                vehicle.wait_time += 1
                self.metrics["total_wait"] += 1
            self.metrics["speed_sum"] += vehicle.speed
            self.metrics["speed_samples"] += 1
            if -6 <= vehicle.distance <= 6:
                vehicle.entered_intersection = True

    def _detect_collisions(self) -> set[str]:
        collided: set[str] = set()
        active = [vehicle for vehicle in self.vehicles.values() if vehicle.active]

        for i, first in enumerate(active):
            for second in active[i + 1 :]:
                same_lane_gap = abs(first.distance - second.distance)
                if first.approach == second.approach and same_lane_gap < 4.0:
                    collided.update([first.agent_id, second.agent_id])
                    continue

                first_inside = self._crossed_conflict_zone(first)
                second_inside = self._crossed_conflict_zone(second)
                if first_inside and second_inside and self._movements_conflict(first, second):
                    collided.update([first.agent_id, second.agent_id])

        for agent_id in collided:
            vehicle = self.vehicles[agent_id]
            if not vehicle.crashed:
                vehicle.crashed = True
                self.metrics["collisions"] += 1
        return collided

    def _detect_near_misses(self) -> set[str]:
        near: set[str] = set()
        active = [vehicle for vehicle in self.vehicles.values() if vehicle.active]
        for i, first in enumerate(active):
            for second in active[i + 1 :]:
                if first.approach == second.approach:
                    if 4.0 <= abs(first.distance - second.distance) < 8.0:
                        near.update([first.agent_id, second.agent_id])
                    continue
                if not self._movements_conflict(first, second):
                    continue
                if first.distance < -8 or second.distance < -8:
                    continue
                eta_gap = abs(first.eta - second.eta)
                if eta_gap < self.config.near_miss_gap and min(first.distance, second.distance) < 35:
                    near.update([first.agent_id, second.agent_id])

        for agent_id in near:
            self.vehicles[agent_id].near_misses += 1
            self.metrics["near_misses"] += 1
        return near

    def _complete_finished_agents(self) -> None:
        for vehicle in self.vehicles.values():
            if not vehicle.active:
                continue
            if vehicle.distance <= self.config.intersection_exit:
                vehicle.completed = True
                vehicle.completed_step = self.step_count
                self.metrics["completed"] += 1
                self.metrics["travel_time_sum"] += self.step_count - vehicle.spawn_step

    def _reward(self, vehicle: Vehicle, collided: bool, near_miss: bool) -> float:
        progress = np.clip(vehicle.last_distance - vehicle.distance, -2.0, self.config.max_speed)
        reward = 0.18 * float(progress)

        if vehicle.speed < 0.5 and vehicle.distance > self.config.intersection_exit:
            reward -= 0.18
        if near_miss:
            reward -= 4.0
        if collided:
            reward -= 120.0
        if vehicle.completed:
            reward += 32.0

        reward -= 0.015 * len([v for v in self.vehicles.values() if v.active])
        return float(reward)

    def _risk_map(self) -> dict[str, float]:
        risk: dict[str, float] = {}
        active = [vehicle for vehicle in self.vehicles.values() if vehicle.active]
        for vehicle in active:
            closest = math.inf
            for other in active:
                if vehicle.agent_id == other.agent_id:
                    continue
                if not self._movements_conflict(vehicle, other):
                    continue
                closest = min(closest, abs(vehicle.eta - other.eta))
            risk[vehicle.agent_id] = closest
        return risk

    def _observations(self) -> dict[str, np.ndarray]:
        observations: dict[str, np.ndarray] = {}
        risk = self._risk_map()
        active = [vehicle for vehicle in self.vehicles.values() if vehicle.active]
        for vehicle in active:
            queue_ahead = sum(
                1
                for other in active
                if other.agent_id != vehicle.agent_id
                and other.approach == vehicle.approach
                and other.distance < vehicle.distance
            )
            priority = self._has_priority(vehicle)
            comm_density = sum(
                1
                for other in active
                if other.agent_id != vehicle.agent_id and abs(other.distance - vehicle.distance) < self.config.communication_range
            )
            route_idx = ROUTES.index(vehicle.route)
            observations[vehicle.agent_id] = np.array(
                [
                    np.clip(vehicle.distance / self.config.approach_length, -0.3, 1.2),
                    vehicle.speed / self.config.max_speed,
                    vehicle.approach / 3.0,
                    route_idx / 2.0,
                    min(vehicle.eta / 15.0, 1.0),
                    min(queue_ahead / 4.0, 1.0),
                    min(risk.get(vehicle.agent_id, 15.0) / 6.0, 1.0),
                    1.0 if priority else 0.0,
                    min(comm_density / max(self.config.max_active_agents - 1, 1), 1.0),
                    (self.step_count % self.config.signal_cycle) / self.config.signal_cycle,
                ],
                dtype=np.float32,
            )
        return observations

    def _has_priority(self, vehicle: Vehicle) -> bool:
        contenders = [
            other
            for other in self.vehicles.values()
            if other.active
            and other.agent_id != vehicle.agent_id
            and self._movements_conflict(vehicle, other)
            and abs(vehicle.eta - other.eta) < self.config.safe_time_gap
        ]
        if not contenders:
            return True
        best = min(contenders + [vehicle], key=lambda item: (item.eta, item.priority_stamp))
        return best.agent_id == vehicle.agent_id

    @staticmethod
    def _movements_conflict(first: Vehicle, second: Vehicle) -> bool:
        if first.approach == second.approach:
            return True
        opposite = abs(first.approach - second.approach) == 2
        if first.route == "right" and second.route == "right":
            return False
        if opposite and first.route == "straight" and second.route == "straight":
            return False
        return True

    @staticmethod
    def _crossed_conflict_zone(vehicle: Vehicle) -> bool:
        zone_min = -5.5
        zone_max = 5.5
        return (
            zone_min <= vehicle.distance <= zone_max
            or zone_min <= vehicle.last_distance <= zone_max
            or (vehicle.last_distance > zone_max and vehicle.distance < zone_min)
        )

    def _record_trace(self) -> None:
        for vehicle in self.vehicles.values():
            x, y = self._xy(vehicle)
            self.trace.append(
                {
                    "step": self.step_count,
                    "agent_id": vehicle.agent_id,
                    "x": x,
                    "y": y,
                    "speed": vehicle.speed,
                    "approach": APPROACHES[vehicle.approach],
                    "route": vehicle.route,
                    "completed": vehicle.completed,
                    "crashed": vehicle.crashed,
                }
            )

    def _xy(self, vehicle: Vehicle) -> tuple[float, float]:
        lane = 4.0
        if vehicle.distance >= 0:
            if vehicle.approach == 0:
                return -lane, vehicle.distance
            if vehicle.approach == 1:
                return vehicle.distance, lane
            if vehicle.approach == 2:
                return lane, -vehicle.distance
            return -vehicle.distance, -lane

        exit_approach = self._exit_approach(vehicle.approach, vehicle.route)
        outbound = abs(vehicle.distance)
        if exit_approach == 0:
            return lane, outbound
        if exit_approach == 1:
            return outbound, -lane
        if exit_approach == 2:
            return -lane, -outbound
        return -outbound, lane

    @staticmethod
    def _exit_approach(approach: int, route: str) -> int:
        if route == "straight":
            return (approach + 2) % 4
        if route == "right":
            return (approach + 1) % 4
        return (approach + 3) % 4
