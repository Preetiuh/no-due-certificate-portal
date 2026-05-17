# Phase 2 Project: Multi-Agent Coordination Strategies for Autonomous Vehicles

This project turns the Phase 1 research plan into a runnable Phase 2 prototype.A multi-agent environment API, vehicle agents, action dictionaries, reward dictionaries, and repeatable evaluation metrics.

The local simulator is intentionally lightweight so it can run on a normal laptop without CARLA, SMARTS, SUMO, or a GPU. The code also includes a SMARTS adapter placeholder showing where the same agent/reward/evaluation pipeline can be connected to the real SMARTS simulator for final deployment.

## Project Thesis

Autonomous vehicles should not only make good individual decisions. At intersections, they need cooperative intelligence: share intent, estimate conflict risk, yield fairly, and keep traffic moving without central control. This prototype compares:

- Non-coordinated greedy driving
- Rule-based traffic-light coordination
- V2V priority coordination with a safety shield
- Tabular multi-agent reinforcement learning with shared policy learning

## What Is Advanced in This Phase

- Decentralized multi-agent interface inspired by MACAD-Gym
- V2V intent packet model: each vehicle exposes ETA, route, speed, and priority
- Risk-aware reward function: progress, waiting, completion, collision, near-miss, and cooperative yielding
- Hybrid safety shield: prevents unsafe "go" actions near conflict points
- Baseline vs coordinated vs learned policy comparison
- Generated charts and report-ready metrics
- SMARTS-ready adapter layer for future simulator integration

## Folder Structure

```text
av_marl_phase2/
  av_marl/
    agents.py              # Baseline, V2V, traffic signal, and Q-learning controllers
    config.py              # Scenario dataclasses and JSON loading
    environment.py         # Multi-agent intersection simulator
    run.py                 # Training/evaluation CLI
    smarts_adapter.py      # SMARTS integration skeleton
    visualization.py       # Charts and trajectory plots
  configs/
    phase2_intersection.json
  reports/
    phase1_to_phase2_analysis.md
    literature_survey.md
  outputs/
    .gitkeep
  requirements.txt
```

## Setup

```bash
cd "C:\Users\preet\OneDrive\Documents\New project 3\av_marl_phase2"
python -m pip install -r requirements.txt
```

The current prototype uses `numpy`, `pandas`, and `matplotlib`. PyTorch and SMARTS are listed as optional future dependencies in the analysis report because they are not installed in this local environment.

## Run the Project

```bash
python -m av_marl.run --episodes 80 --train-episodes 180 --output outputs/latest
```

The command creates:

- `outputs/latest/episode_metrics.csv`
- `outputs/latest/metrics_summary.csv`
- `outputs/latest/training_curve.csv`
- `outputs/latest/policy_comparison.png`
- `outputs/latest/training_curve.png`
- `outputs/latest/sample_trajectory.png`
- `outputs/latest/q_table.json`

## Run the Working Visual Simulation

The advanced visual model is in `demo/`. It shows the vehicles moving, slowing for traffic signals, detecting side-vehicle speed, exchanging V2V messages, following route targets, and comparing coordinated vs non-coordinated performance.

```bash
cd "C:\Users\preet\OneDrive\Documents\New project 3\av_marl_phase2\demo"
python -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/
```

Demo features:

- Live multi-vehicle intersection simulation
- Coordinated V2V, non-coordinated, signal-rule, and RL-learning modes
- Traffic signal prediction before upcoming stops
- Same-lane gap and side-vehicle speed detection
- Safety shield for accident prevention
- Live location button using browser geolocation when available
- Live graphs for safety, waiting time, and traffic flow
- Coordinated vs non-coordinated comparison chart

## Phase 2 Evaluation Metrics

- Collision count
- Near-miss count
- Completed vehicles
- Throughput
- Average wait time
- Mean reward
- Mean travel time

## Visual Simulation Deliverable

The working model display is available at:

```text
demo/index.html
```

For browser module support and live-location support, run it through the local server command shown above.

## How This Maps to Your Slides

- Introduction: implemented as a working multi-agent coordination problem
- Literature survey: upgraded with verified project positioning and shortcomings
- Project statement/objectives: translated into measurable code outputs
- Methodology: implemented as environment -> agents -> observation/state -> action -> reward -> learning -> evaluation
- Requirements: kept laptop-friendly while preserving SMARTS/SUMO/PyTorch upgrade path
- Expected outcome: measured using generated reports and plots
