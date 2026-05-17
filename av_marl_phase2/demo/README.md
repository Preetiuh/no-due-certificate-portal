# Interactive Simulation Demo

Open this demo to see the Phase 2 model working visually.

## Run

```bash
cd "C:\Users\preet\OneDrive\Documents\New project 3\av_marl_phase2\demo"
python -m http.server 8765 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/
```

## What It Shows

- Multiple autonomous vehicles moving through a four-way smart intersection
- Traffic signal prediction and controlled deceleration before red/yellow lights
- Same-lane gap detection to maintain disciplined speed
- Side-vehicle ETA and speed detection for conflict avoidance
- V2V communication lines between vehicles with potential conflicts
- Safety shield that blocks unsafe movement into the conflict zone
- Reinforcement-learning mode with live Q-table style action selection
- Coordinated vs non-coordinated comparison charts
- Live metrics: completed vehicles, collisions, average wait, and flow rate
- Optional browser geolocation button for live location demonstration

## Policy Modes

- `Coordinated V2V`: Uses signal awareness, V2V intent packets, side-vehicle speed detection, and safety shield.
- `Non-Coordinated`: Greedy vehicle decisions without V2V negotiation or signal prediction.
- `Signal Rules`: Obeys traffic lights and front-vehicle gaps, but does not negotiate V2V priority.
- `RL Learning`: Uses a compact Q-learning style policy and safety shield.

