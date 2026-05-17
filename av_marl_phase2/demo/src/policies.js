import { ACTIONS, WORLD } from "./config.js";
import { pathsConflict } from "./roadNetwork.js";
import { secondsToNextGreen, signalForApproach } from "./signals.js";
import { clamp, dist } from "./utils.js";

function stopSpeed(distanceMeters) {
  if (distanceMeters <= 0) return 0;
  return Math.sqrt(Math.max(0, 2 * 4.2 * Math.max(0, distanceMeters - 2)));
}

export function senseVehicle(vehicle, world) {
  const signal = signalForApproach(vehicle.approach, world.time);
  let frontGap = Infinity;
  let frontVehicleSpeed = Infinity;
  let frontVehicleId = null;
  let sideThreat = null;
  let closestSideScore = Infinity;

  for (const other of world.vehicles) {
    if (other.id === vehicle.id || !other.active) continue;

    if (other.approach === vehicle.approach && other.progress > vehicle.progress) {
      const gap = other.progress - vehicle.progress;
      if (gap < frontGap) {
        frontGap = gap;
        frontVehicleSpeed = other.speed;
        frontVehicleId = other.id;
      }
    }

    if (pathsConflict(vehicle, other) && other.approach !== vehicle.approach) {
      const etaGap = Math.abs(vehicle.etaToConflict - other.etaToConflict);
      const bothApproaching = vehicle.distanceToConflict > -8 && other.distanceToConflict > -8;
      const closeEnough = vehicle.distanceToConflict < 58 && other.distanceToConflict < 58;
      if (bothApproaching && closeEnough && etaGap < closestSideScore) {
        closestSideScore = etaGap;
        sideThreat = {
          id: other.id,
          speed: other.speed,
          etaGap,
          eta: other.etaToConflict,
          approach: other.approach,
          route: other.route,
        };
      }
    }
  }

  const priority = hasPriority(vehicle, world);
  return {
    signal,
    frontGap,
    frontVehicleSpeed,
    frontVehicleId,
    sideThreat,
    priority,
    secondsToNextGreen: secondsToNextGreen(vehicle.approach, world.time),
  };
}

export function hasPriority(vehicle, world) {
  let best = vehicle;
  for (const other of world.vehicles) {
    if (other.id === vehicle.id || !other.active) continue;
    if (!pathsConflict(vehicle, other)) continue;
    if (other.approach === vehicle.approach) continue;
    if (Math.abs(vehicle.etaToConflict - other.etaToConflict) > WORLD.safeTimeGap) continue;
    if (other.distanceToConflict > 64 || vehicle.distanceToConflict > 64) continue;
    if (other.etaToConflict < best.etaToConflict - 0.15) best = other;
    if (Math.abs(other.etaToConflict - best.etaToConflict) <= 0.15 && other.id < best.id) best = other;
  }
  return best.id === vehicle.id;
}

export function decide(vehicle, world) {
  const mode = world.mode;
  const sensors = senseVehicle(vehicle, world);
  if (mode === "noncoordinated") return nonCoordinated(vehicle, world, sensors);
  if (mode === "signal") return signalRules(vehicle, world, sensors);
  if (mode === "learning") return learningPolicy(vehicle, world, sensors);
  return coordinated(vehicle, world, sensors);
}

function baseDecision(vehicle, world, sensors) {
  let targetSpeed = vehicle.speedLimit;
  let action = ACTIONS.go;
  let reason = "Maintaining route speed";

  if (sensors.frontGap < WORLD.minFrontGap * 3.2) {
    targetSpeed = Math.min(targetSpeed, Math.max(0, sensors.frontVehicleSpeed * 0.9));
    action = ACTIONS.yield;
    reason = `Maintaining safe gap behind ${sensors.frontVehicleId}`;
  }

  if (sensors.frontGap < WORLD.minFrontGap * 1.7) {
    targetSpeed = 0;
    action = ACTIONS.brake;
    reason = `Emergency gap control behind ${sensors.frontVehicleId}`;
  }

  if (world.signalAwareness && vehicle.distanceToStop > 0 && vehicle.distanceToStop < 66) {
    if (sensors.signal === "red") {
      targetSpeed = Math.min(targetSpeed, stopSpeed(vehicle.distanceToStop));
      action = targetSpeed < 1 ? ACTIONS.brake : ACTIONS.yield;
      reason = "Upcoming red signal, controlled deceleration";
    } else if (sensors.signal === "yellow" && vehicle.distanceToStop < 34) {
      targetSpeed = Math.min(targetSpeed, stopSpeed(vehicle.distanceToStop));
      action = ACTIONS.yield;
      reason = "Yellow signal, preparing to stop";
    }
  }

  return { targetSpeed, action, reason, ...sensors };
}

function nonCoordinated(vehicle, world, sensors) {
  const decision = {
    targetSpeed: vehicle.speedLimit * 1.16,
    action: ACTIONS.go,
    reason: "No V2V, no signal prediction, greedy speed choice",
    ...sensors,
  };
  if (sensors.frontGap < WORLD.minFrontGap * 0.75) {
    decision.targetSpeed = Math.max(0, vehicle.speed - 2.2);
    decision.action = ACTIONS.yield;
    decision.reason = "Late same-lane reaction";
  }
  return decision;
}

function signalRules(vehicle, world, sensors) {
  const decision = baseDecision(vehicle, world, sensors);
  if (sensors.signal === "green" && decision.action !== ACTIONS.yield) {
    decision.reason = "Following signal phase and lane gap";
  }
  return decision;
}

function coordinated(vehicle, world, sensors) {
  const decision = baseDecision(vehicle, world, sensors);
  if (!world.v2vEnabled) return decision;

  if (sensors.sideThreat && sensors.sideThreat.etaGap < WORLD.safeTimeGap && vehicle.distanceToConflict < 48) {
    if (sensors.priority) {
      decision.targetSpeed = Math.min(Math.max(decision.targetSpeed, vehicle.speedLimit * 0.58), vehicle.speedLimit * 0.78);
      decision.action = ACTIONS.go;
      decision.reason = `Priority over ${sensors.sideThreat.id}; holding disciplined speed`;
    } else {
      decision.targetSpeed = vehicle.distanceToConflict < 44 ? 0 : Math.min(decision.targetSpeed, stopSpeed(vehicle.distanceToConflict - 3));
      decision.action = vehicle.distanceToConflict < 44 ? ACTIONS.brake : ACTIONS.yield;
      decision.reason = `Yielding to ${sensors.sideThreat.id} at ${Math.round(sensors.sideThreat.speed * 3.6)} km/h`;
    }
  }

  if (world.safetyShield && !sensors.priority && sensors.sideThreat && sensors.sideThreat.etaGap < WORLD.safeTimeGap + 0.8 && vehicle.distanceToConflict < 50) {
    decision.targetSpeed = 0;
    decision.action = ACTIONS.brake;
    decision.reason = `Safety shield stopped unsafe conflict with ${sensors.sideThreat.id}`;
  }

  return decision;
}

function learningPolicy(vehicle, world, sensors) {
  const state = qState(vehicle, sensors);
  const qValues = world.qTable.get(state) ?? [0.02, 0.05, 0.11, 0.13];
  const epsilon = world.learningEpsilon;
  let action;
  if (world.random.next() < epsilon) {
    action = Math.floor(world.random.next() * 4);
  } else {
    action = qValues.indexOf(Math.max(...qValues));
  }

  const base = coordinated(vehicle, world, sensors);
  const speeds = [0, Math.min(base.targetSpeed, vehicle.speedLimit * 0.35), vehicle.speedLimit * 0.68, vehicle.speedLimit];
  base.action = action;
  base.targetSpeed = Math.min(base.targetSpeed, speeds[action]);
  base.reason = `RL action ${base.actionLabel ?? action} from state ${state}`;

  if (world.safetyShield && !sensors.priority && sensors.sideThreat && sensors.sideThreat.etaGap < WORLD.safeTimeGap && vehicle.distanceToConflict < 30) {
    base.action = ACTIONS.brake;
    base.targetSpeed = 0;
    base.reason = "RL action corrected by safety shield";
  }

  vehicle.lastQState = state;
  vehicle.lastQAction = base.action;
  return base;
}

export function updateLearning(world, vehicle, reward) {
  if (!vehicle.lastQState || vehicle.lastQAction == null) return;
  const oldValues = world.qTable.get(vehicle.lastQState) ?? [0.02, 0.05, 0.11, 0.13];
  const sensors = senseVehicle(vehicle, world);
  const nextState = qState(vehicle, sensors);
  const nextValues = world.qTable.get(nextState) ?? [0.02, 0.05, 0.11, 0.13];
  const old = oldValues[vehicle.lastQAction];
  const target = reward + 0.9 * Math.max(...nextValues);
  oldValues[vehicle.lastQAction] = old + 0.16 * (target - old);
  world.qTable.set(vehicle.lastQState, oldValues);
  world.learningEpsilon = clamp(world.learningEpsilon * 0.9994, 0.03, 0.22);
}

function qState(vehicle, sensors) {
  const distanceBin = vehicle.distanceToConflict < 0 ? 0 : vehicle.distanceToConflict < 18 ? 1 : vehicle.distanceToConflict < 42 ? 2 : 3;
  const speedBin = vehicle.speed < 1 ? 0 : vehicle.speed < 7 ? 1 : 2;
  const signalBin = sensors.signal === "green" ? 2 : sensors.signal === "yellow" ? 1 : 0;
  const sideBin = sensors.sideThreat ? (sensors.sideThreat.etaGap < WORLD.safeTimeGap ? 1 : 0) : 0;
  const priorityBin = sensors.priority ? 1 : 0;
  return `${distanceBin}|${speedBin}|${signalBin}|${sideBin}|${priorityBin}`;
}
