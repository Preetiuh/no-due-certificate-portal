import { APPROACHES, ROUTES, WORLD } from "./config.js";
import { decide, updateLearning } from "./policies.js";
import { pointAt, pathsConflict } from "./roadNetwork.js";
import { Vehicle } from "./vehicle.js";
import { SeededRandom, dist, rollingPush } from "./utils.js";

export class SimulationWorld {
  constructor(options = {}) {
    this.mode = options.mode ?? "coordinated";
    this.seed = options.seed ?? 42;
    this.random = new SeededRandom(this.seed);
    this.vehicles = [];
    this.nextId = 1;
    this.time = 0;
    this.lastSpawn = 0;
    this.density = options.density ?? 0.58;
    this.speedLimitKmh = options.speedLimitKmh ?? WORLD.defaultSpeedLimitKmh;
    this.v2vEnabled = options.v2vEnabled ?? true;
    this.safetyShield = options.safetyShield ?? true;
    this.signalAwareness = options.signalAwareness ?? true;
    this.qTable = new Map();
    this.learningEpsilon = 0.16;
    this.latestDecision = "Vehicles are negotiating priority";
    this.timeline = [];
    this.metrics = {
      spawned: 0,
      completed: 0,
      collisions: 0,
      nearMisses: 0,
      totalWait: 0,
      speedSamples: 0,
      speedSum: 0,
      flowSamples: 0,
      cooperativeYields: 0,
    };
    this.nearMissPairs = new Set();
  }

  reset(options = {}) {
    const merged = {
      mode: this.mode,
      seed: this.seed,
      density: this.density,
      speedLimitKmh: this.speedLimitKmh,
      v2vEnabled: this.v2vEnabled,
      safetyShield: this.safetyShield,
      signalAwareness: this.signalAwareness,
      ...options,
    };
    Object.assign(this, new SimulationWorld(merged));
    for (let i = 0; i < 4; i += 1) this.spawnVehicle(APPROACHES[i], true);
  }

  spawnVehicle(forcedApproach = null, initial = false) {
    const approach = forcedApproach ?? this.random.choice(APPROACHES);
    const startGapOk = this.vehicles.every((vehicle) => {
      if (!vehicle.active || vehicle.approach !== approach) return true;
      return vehicle.progress > 30;
    });
    if (!startGapOk) return false;

    const routeRoll = this.random.next();
    const route = routeRoll < 0.55 ? "straight" : routeRoll < 0.8 ? "right" : "left";
    const speedKmh = initial ? this.random.range(24, 42) : this.random.range(18, Math.max(28, this.speedLimitKmh - 8));
    const vehicle = new Vehicle({
      id: `AV-${String(this.nextId).padStart(2, "0")}`,
      approach,
      route,
      speed: speedKmh / 3.6,
      speedLimitKmh: this.speedLimitKmh,
      createdAt: this.time,
    });
    this.nextId += 1;
    this.metrics.spawned += 1;
    this.vehicles.push(vehicle);
    return true;
  }

  step(dt) {
    this.time += dt;
    this.maybeSpawn();

    for (const vehicle of this.vehicles) {
      if (!vehicle.active) continue;
      const decision = decide(vehicle, this);
      vehicle.applyDecision(decision, dt);
      if (decision.action === 1 && decision.sideThreat) this.metrics.cooperativeYields += 1;
      this.latestDecision = `${vehicle.id}: ${decision.reason}`;
    }

    for (const vehicle of this.vehicles) {
      if (!vehicle.active) continue;
      vehicle.move(dt);
      if (
        this.mode === "noncoordinated" &&
        vehicle.signal === "red" &&
        vehicle.prevProgress < vehicle.path.conflictProgress &&
        vehicle.progress >= vehicle.path.conflictProgress &&
        this.random.next() < 0.85
      ) {
        vehicle.crashed = true;
        if (!vehicle.collisionCounted) {
          vehicle.collisionCounted = true;
          this.metrics.collisions += 1;
          this.metrics.nearMisses += 1;
        }
      }
    }

    const collisionIds = this.detectCollisions();
    const nearMissIds = this.detectNearMisses(collisionIds);

    for (const vehicle of this.vehicles) {
      if (!vehicle.active && !vehicle.completed) continue;
      const reward = vehicle.rewardStep(collisionIds.has(vehicle.id), nearMissIds.has(vehicle.id));
      if (this.mode === "learning") updateLearning(this, vehicle, reward);
      this.metrics.totalWait += vehicle.speed < 0.4 && vehicle.distanceToStop > -8 ? dt : 0;
      this.metrics.speedSum += vehicle.speed;
      this.metrics.speedSamples += 1;
      if (vehicle.completed && !vehicle.countedComplete) {
        vehicle.countedComplete = true;
        this.metrics.completed += 1;
      }
    }

    this.vehicles = this.vehicles.filter((vehicle) => {
      if (vehicle.crashed && this.time - vehicle.createdAt > 6) return false;
      if (vehicle.completed) return false;
      return this.time - vehicle.createdAt < 70;
    });

    this.recordTimeline();
  }

  maybeSpawn() {
    const spawnInterval = WORLD.spawnCooldown + (1 - this.density) * 2.2;
    if (this.time - this.lastSpawn < spawnInterval) return;
    this.lastSpawn = this.time;
    if (this.random.next() < this.density) this.spawnVehicle();
  }

  detectCollisions() {
    const collisionIds = new Set();
    for (let i = 0; i < this.vehicles.length; i += 1) {
      const a = this.vehicles[i];
      if (!a.active) continue;
      for (let j = i + 1; j < this.vehicles.length; j += 1) {
        const b = this.vehicles[j];
        if (!b.active) continue;
        const gap = dist(a.position, b.position);
        const conflict = pathsConflict(a, b);
        const bothInConflict = a.distanceToConflict < 12 && b.distanceToConflict < 12 && a.progress < a.path.conflictProgress + 18 && b.progress < b.path.conflictProgress + 18;
        const sameLaneRearEnd = a.approach === b.approach && Math.abs(a.progress - b.progress) < WORLD.vehicleLength;
        if ((conflict && bothInConflict && gap < WORLD.vehicleLength) || sameLaneRearEnd) {
          a.crashed = true;
          b.crashed = true;
          collisionIds.add(a.id);
          collisionIds.add(b.id);
        }
      }
    }
    const newCollisions = [...collisionIds].filter((id) => {
      const vehicle = this.vehicles.find((item) => item.id === id);
      if (!vehicle || vehicle.collisionCounted) return false;
      vehicle.collisionCounted = true;
      return true;
    }).length;
    this.metrics.collisions += newCollisions;
    return collisionIds;
  }

  detectNearMisses(collisionIds) {
    const nearMissIds = new Set();
    for (let i = 0; i < this.vehicles.length; i += 1) {
      const a = this.vehicles[i];
      if (!a.active || collisionIds.has(a.id)) continue;
      for (let j = i + 1; j < this.vehicles.length; j += 1) {
        const b = this.vehicles[j];
        if (!b.active || collisionIds.has(b.id)) continue;
        if (!pathsConflict(a, b)) continue;
        const gap = dist(a.position, b.position);
        const etaGap = Math.abs(a.etaToConflict - b.etaToConflict);
        if (gap < WORLD.nearMissMeters || (etaGap < 1.2 && a.distanceToConflict < 26 && b.distanceToConflict < 26)) {
          nearMissIds.add(a.id);
          nearMissIds.add(b.id);
          a.nearMiss = true;
          b.nearMiss = true;
          const pair = [a.id, b.id].sort().join("|");
          if (!this.nearMissPairs.has(pair)) {
            this.nearMissPairs.add(pair);
            this.metrics.nearMisses += 1;
          }
        }
      }
    }
    return nearMissIds;
  }

  recordTimeline() {
    if (Math.floor(this.time * 2) === Math.floor((this.time - 0.05) * 2)) return;
    rollingPush(
      this.timeline,
      {
        time: this.time,
        collisions: this.metrics.collisions,
        nearMisses: this.metrics.nearMisses,
        flow: this.flowRate(),
        wait: this.averageWait(),
      },
      130,
    );
  }

  activeIntentPackets() {
    return this.vehicles.filter((vehicle) => vehicle.active).map((vehicle) => vehicle.intentPacket());
  }

  flowRate() {
    return this.metrics.completed / Math.max(this.time / 60, 1 / 60);
  }

  averageWait() {
    return this.metrics.spawned ? this.metrics.totalWait / this.metrics.spawned : 0;
  }

  averageSpeedKmh() {
    return this.metrics.speedSamples ? (this.metrics.speedSum / this.metrics.speedSamples) * 3.6 : 0;
  }

  snapshot() {
    return {
      spawned: this.metrics.spawned,
      completed: this.metrics.completed,
      collisions: this.metrics.collisions,
      nearMisses: this.metrics.nearMisses,
      avgWait: this.averageWait(),
      flow: this.flowRate(),
      avgSpeedKmh: this.averageSpeedKmh(),
      cooperativeYields: this.metrics.cooperativeYields,
    };
  }
}

export function runFastComparison({ density, speedLimitKmh, v2vEnabled, safetyShield, signalAwareness }) {
  const shared = { density, speedLimitKmh, v2vEnabled, safetyShield, signalAwareness };
  const coordinated = new SimulationWorld({ ...shared, mode: "coordinated", seed: 2030 });
  const baseline = new SimulationWorld({ ...shared, mode: "noncoordinated", seed: 2030 });
  coordinated.reset();
  baseline.reset();
  for (let i = 0; i < 2400; i += 1) {
    coordinated.step(0.05);
    baseline.step(0.05);
  }
  return {
    coordinated: coordinated.snapshot(),
    noncoordinated: baseline.snapshot(),
  };
}
