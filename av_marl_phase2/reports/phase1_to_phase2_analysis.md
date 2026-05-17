# Phase 1 to Phase 2 Analysis

## Phase 1 Baseline

The Phase 1 presentation defined the project as a research and planning task:

- Topic: multi-agent coordination strategies for autonomous vehicle systems
- Main problem: multiple autonomous vehicles can cause collision risk and congestion when they make isolated decisions
- Proposed method: multi-agent reinforcement learning with vehicle-to-vehicle communication
- Evaluation idea: waiting time, traffic flow, accident reduction, and safety
- Simulator direction: SUMO/CARLA/SMARTS-style simulation

## Phase 2 Upgrade

This project converts the plan into an executable prototype:

- A MACAD-Gym-style multi-agent environment is implemented with `reset()` and `step(action_dict)`.
- Every vehicle receives a local observation vector and sends one discrete action.
- The environment returns observation, reward, done, and info dictionaries per agent.
- V2V communication is represented as intent packets containing ETA, approach, route, speed, and priority.
- A risk-aware reward function measures progress, waiting, near misses, collisions, and completion.
- Multiple coordination strategies are compared under the same traffic scenario.

## Sample Project Lessons Used

The provided MACAD-Gym sample is CARLA based. Its exact simulator stack is not reused, but these working patterns are adopted:

- Config-driven scenarios
- Multi-agent actor ids such as `car1`, `car2`, `car3`
- Dictionary-based multi-agent action loop
- Discrete action choices such as brake, forward, and steering-like decisions
- Reward shaping using distance progress, speed, collision penalty, and goal completion
- Scenario definitions for intersection traffic

## Out-of-the-Box Phase 2 Concept

The advanced idea is not just "train cars to move." The prototype treats every car as a small cooperative intelligence unit:

1. Observe local state.
2. Broadcast intent.
3. Predict conflict risk.
4. Choose action using policy.
5. Apply safety shield if the policy proposes a dangerous action.
6. Learn from reward and episode outcome.

This creates a hybrid system: reinforcement learning for adaptation, V2V coordination for cooperation, and safety shielding for reliability.

## Implementation Boundary

SMARTS, SUMO, and PyTorch are future integration layers. They are not installed in the current workspace, so this Phase 2 package includes:

- A laptop-friendly local simulator for demonstrations and metrics
- A `SmartsIntersectionAdapter` skeleton documenting the integration boundary
- A Q-learning controller that can later be replaced with PyTorch DQN/MAPPO/MADDPG

## Evaluation Story

The generated metrics can be used directly in the final presentation:

- Non-coordinated driving is fast but unsafe.
- Fixed signals reduce chaos but increase waiting.
- V2V priority coordination improves the safety/flow balance.
- Reinforcement learning becomes more stable when paired with a safety shield.

