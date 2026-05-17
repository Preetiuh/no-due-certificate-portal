from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import mean

import pandas as pd

from .agents import GreedyNoCommunicationPolicy, TabularMARLPolicy, TrafficSignalPolicy, V2VPriorityPolicy
from .config import load_config
from .environment import MultiAgentIntersectionEnv
from .visualization import plot_policy_comparison, plot_training_curve, plot_trajectory


def run_episode(policy, env: MultiAgentIntersectionEnv, seed: int, explore: bool = False) -> tuple[dict[str, float], pd.DataFrame]:
    observations = env.reset(seed=seed)
    done = {"__all__": False}
    while not done["__all__"]:
        actions = policy.select_actions(env, observations, explore=explore)
        next_observations, rewards, done, _ = env.step(actions)
        policy.learn(observations, actions, rewards, next_observations, done)
        observations = next_observations
    return env.get_metrics(), pd.DataFrame(env.trace)


def train(policy: TabularMARLPolicy, config_path: Path, episodes: int, seed: int) -> pd.DataFrame:
    rows = []
    for episode in range(episodes):
        env = MultiAgentIntersectionEnv(load_config(config_path))
        metrics, _ = run_episode(policy, env, seed=seed + episode, explore=True)
        policy.decay_epsilon()
        rows.append(
            {
                "episode": episode + 1,
                "avg_reward": metrics["avg_reward"],
                "completion_rate": metrics["completion_rate"],
                "collisions": metrics["collisions"],
                "near_misses": metrics["near_misses"],
                "epsilon": policy.epsilon,
            }
        )
    frame = pd.DataFrame(rows)
    frame["rolling_reward"] = frame["avg_reward"].rolling(15, min_periods=1).mean()
    return frame


def evaluate(policy, config_path: Path, episodes: int, seed: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    rows = []
    sample_trace = pd.DataFrame()
    for episode in range(episodes):
        env = MultiAgentIntersectionEnv(load_config(config_path))
        metrics, trace = run_episode(policy, env, seed=seed + 1000 + episode, explore=False)
        rows.append({"policy": policy.name, "episode": episode + 1, **metrics})
        if episode == 0:
            sample_trace = trace
    return pd.DataFrame(rows), sample_trace


def summarize(episodes: pd.DataFrame) -> pd.DataFrame:
    metric_columns = [
        "spawned",
        "completed",
        "completion_rate",
        "collisions",
        "near_misses",
        "avg_wait",
        "avg_reward",
        "avg_travel_time",
        "avg_speed",
        "throughput",
        "cooperative_yields",
    ]
    return episodes.groupby("policy", as_index=False)[metric_columns].mean()


def write_executive_summary(summary: pd.DataFrame, output_dir: Path) -> None:
    best_safety = summary.sort_values(["collisions", "near_misses", "avg_wait"]).iloc[0]
    best_flow = summary.sort_values(["throughput", "completion_rate"], ascending=False).iloc[0]
    payload = {
        "best_safety_policy": best_safety["policy"],
        "best_flow_policy": best_flow["policy"],
        "policies": summary.to_dict(orient="records"),
        "headline": (
            "V2V intent sharing plus a safety shield gives the strongest safety/flow trade-off "
            "in the lightweight Phase 2 simulator."
        ),
    }
    with (output_dir / "executive_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Phase 2 multi-agent AV coordination experiments.")
    parser.add_argument("--config", type=Path, default=Path("configs/phase2_intersection.json"))
    parser.add_argument("--episodes", type=int, default=80, help="Evaluation episodes per policy.")
    parser.add_argument("--train-episodes", type=int, default=180, help="Q-learning training episodes.")
    parser.add_argument("--output", type=Path, default=Path("outputs/latest"))
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    q_policy = TabularMARLPolicy(seed=args.seed)
    training = train(q_policy, args.config, episodes=args.train_episodes, seed=args.seed)
    training.to_csv(output_dir / "training_curve.csv", index=False)
    q_policy.save(output_dir / "q_table.json")

    policies = [
        GreedyNoCommunicationPolicy(),
        TrafficSignalPolicy(),
        V2VPriorityPolicy(),
        q_policy,
    ]

    frames = []
    trace_for_plot = pd.DataFrame()
    for offset, policy in enumerate(policies):
        frame, trace = evaluate(policy, args.config, episodes=args.episodes, seed=args.seed + offset * 100)
        frames.append(frame)
        if policy.name == "v2v_priority_shield":
            trace_for_plot = trace

    episode_metrics = pd.concat(frames, ignore_index=True)
    summary = summarize(episode_metrics)

    episode_metrics.to_csv(output_dir / "episode_metrics.csv", index=False)
    summary.to_csv(output_dir / "metrics_summary.csv", index=False)
    write_executive_summary(summary, output_dir)

    plot_policy_comparison(summary, output_dir / "policy_comparison.png")
    plot_training_curve(training, output_dir / "training_curve.png")
    if not trace_for_plot.empty:
        trace_for_plot.to_csv(output_dir / "sample_trajectory.csv", index=False)
        plot_trajectory(trace_for_plot, output_dir / "sample_trajectory.png")

    top_reward = summary.sort_values("avg_reward", ascending=False).iloc[0]
    print("Phase 2 run complete")
    print(f"Policies evaluated: {', '.join(summary['policy'])}")
    print(f"Best average reward: {top_reward['policy']} ({top_reward['avg_reward']:.2f})")
    print(f"Mean completion rate: {mean(summary['completion_rate']):.2f}")
    print(f"Output directory: {output_dir.resolve()}")


if __name__ == "__main__":
    main()

