# Literature Survey for Phase 2

| Title / Area | Author & Year | Technique Used | Useful Insight | Shortcoming / Gap |
| --- | --- | --- | --- | --- |
| SMARTS: Scalable Multi-Agent Reinforcement Learning Training School for Autonomous Driving | Zhou et al., 2021 | Multi-agent RL simulator | Strong simulator foundation for social-agent training | Realistic training can require high compute |
| Multi-Agent Connected Autonomous Driving using Deep Reinforcement Learning | Palanisamy, 2019 | MACAD-Gym, CARLA, Deep RL | Shows a Gym-compatible multi-agent driving environment | CARLA setup is heavy for classroom laptops |
| Multi-Agent Reinforcement Learning: A Selective Overview | Zhang, Yang, and Basar, 2021 | MARL survey | Explains cooperative, competitive, and mixed multi-agent settings | Theory-to-deployment gap remains difficult |
| Deep Reinforcement Learning for Autonomous Driving: A Survey | Kiran et al., 2021 | DRL survey | Reviews perception, planning, and control with RL | Safety validation is still a major barrier |
| Cooperative Intelligent Transport Systems Survey | Chen and Englund, 2020 | V2X communication | Positions V2V/V2I as core for cooperative traffic | Communication delay and reliability affect deployment |
| Safe Reinforcement Learning Survey | Garcia and Fernandez, 2015 | Safe RL | Motivates shields, constraints, and risk-aware learning | Pure reward tuning is not enough for safety-critical driving |

## Literature Gap Converted into Project Feature

The major gap across the literature is not only learning performance. It is the combination of:

- Coordination
- Safety
- Interpretability
- Real-time communication
- Lightweight demonstration

This project addresses that gap with V2V intent sharing, a transparent priority rule, a safety shield, and an RL agent that can be compared against baselines.

## Source Links

- SMARTS paper: https://proceedings.mlr.press/v155/zhou21a.html
- SMARTS documentation: https://smarts.readthedocs.io/
- SUMO documentation: https://sumo.sourceforge.net/docs/
- PyTorch DQN tutorial: https://docs.pytorch.org/tutorials/intermediate/reinforcement_q_learning.html
