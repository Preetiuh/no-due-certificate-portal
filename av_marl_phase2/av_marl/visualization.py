from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd


COLORS = {
    "no_comm_greedy": "#E4572E",
    "fixed_signal": "#2E86AB",
    "v2v_priority_shield": "#2E8B57",
    "shared_q_learning": "#7C3AED",
}


def plot_policy_comparison(summary: pd.DataFrame, output_path: str | Path) -> None:
    metrics = ["completion_rate", "collisions", "near_misses", "avg_wait", "throughput"]
    fig, axes = plt.subplots(1, len(metrics), figsize=(18, 4.8))
    fig.patch.set_facecolor("#F8FAFC")
    for axis, metric in zip(axes, metrics):
        values = summary.set_index("policy")[metric]
        colors = [COLORS.get(policy, "#64748B") for policy in values.index]
        axis.bar(values.index, values.values, color=colors, width=0.72)
        axis.set_title(metric.replace("_", " ").title(), fontsize=10, fontweight="bold")
        axis.tick_params(axis="x", rotation=35, labelsize=8)
        axis.grid(axis="y", alpha=0.22)
        axis.set_axisbelow(True)
    fig.suptitle("Phase 2 Evaluation: Coordination Improves Safety and Flow", fontsize=15, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.92))
    plt.savefig(output_path, dpi=180)
    plt.close(fig)


def plot_training_curve(training: pd.DataFrame, output_path: str | Path) -> None:
    fig, axis = plt.subplots(figsize=(10, 5.2))
    fig.patch.set_facecolor("#F8FAFC")
    axis.plot(training["episode"], training["avg_reward"], color="#7C3AED", linewidth=1.6, label="avg reward")
    axis.plot(training["episode"], training["completion_rate"], color="#2E8B57", linewidth=1.4, label="completion rate")
    if "rolling_reward" in training:
        axis.plot(training["episode"], training["rolling_reward"], color="#111827", linewidth=2.0, label="rolling reward")
    axis.set_title("Shared Q-Learning Stabilizes with Safety Shield", fontsize=14, fontweight="bold")
    axis.set_xlabel("Training episode")
    axis.grid(alpha=0.24)
    axis.legend(frameon=False)
    fig.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close(fig)


def plot_trajectory(trace: pd.DataFrame, output_path: str | Path, title: str = "Sample Coordinated Episode") -> None:
    fig, axis = plt.subplots(figsize=(7.2, 7.2))
    fig.patch.set_facecolor("#F8FAFC")
    axis.set_facecolor("#E2E8F0")
    axis.axhline(0, color="#FFFFFF", linewidth=12, zorder=0)
    axis.axvline(0, color="#FFFFFF", linewidth=12, zorder=0)
    axis.axhline(0, color="#94A3B8", linewidth=1.2, zorder=1)
    axis.axvline(0, color="#94A3B8", linewidth=1.2, zorder=1)
    for agent_id, frame in trace.groupby("agent_id"):
        frame = frame.sort_values("step")
        crashed = bool(frame["crashed"].max())
        color = "#E4572E" if crashed else "#2563EB"
        axis.plot(frame["x"], frame["y"], linewidth=1.2, alpha=0.82, color=color)
        axis.scatter(frame["x"].iloc[-1], frame["y"].iloc[-1], s=22, color=color)
    axis.set_xlim(-90, 90)
    axis.set_ylim(-90, 90)
    axis.set_title(title, fontsize=14, fontweight="bold")
    axis.set_xlabel("x position")
    axis.set_ylabel("y position")
    axis.grid(alpha=0.16)
    axis.set_aspect("equal", adjustable="box")
    fig.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close(fig)

