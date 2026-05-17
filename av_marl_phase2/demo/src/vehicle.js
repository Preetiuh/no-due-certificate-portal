import { ACTION_LABELS, COLORS, WORLD } from "./config.js";
import { headingAt, makePath, pointAt } from "./roadNetwork.js";
import { clamp } from "./utils.js";

export class Vehicle {
  constructor({ id, approach, route, speed, speedLimitKmh, createdAt }) {
    this.id = id;
    this.approach = approach;
    this.route = route;
    this.path = makePath(approach, route);
    this.progress = 0;
    this.prevProgress = 0;
    this.speed = speed;
    this.targetSpeed = speedLimitKmh / 3.6;
    this.speedLimit = speedLimitKmh / 3.6;
    this.createdAt = createdAt;
    this.waitTime = 0;
    this.completed = false;
    this.crashed = false;
    this.nearMiss = false;
    this.priority = false;
    this.action = 2;
    this.reason = "Cruising to next waypoint";
    this.sideThreat = null;
    this.frontGap = Infinity;
    this.signal = "green";
    this.reward = 0;
    this.color = COLORS.vehicle;
  }

  get position() {
    return pointAt(this.path, this.progress);
  }

  get heading() {
    return headingAt(this.path, this.progress);
  }

  get distanceToStop() {
    return this.path.stopProgress - this.progress;
  }

  get distanceToConflict() {
    return this.path.conflictProgress - this.progress;
  }

  get etaToConflict() {
    if (this.distanceToConflict <= 0) return 0;
    return this.distanceToConflict / Math.max(this.speed, 0.4);
  }

  get actionLabel() {
    return ACTION_LABELS[this.action] ?? "Cruise";
  }

  get active() {
    return !this.completed && !this.crashed;
  }

  applyDecision(decision, dt) {
    this.action = decision.action;
    this.reason = decision.reason;
    this.targetSpeed = clamp(decision.targetSpeed, 0, this.speedLimit * 1.18);
    this.priority = Boolean(decision.priority);
    this.sideThreat = decision.sideThreat;
    this.frontGap = decision.frontGap;
    this.signal = decision.signal;
    const desired = this.targetSpeed - this.speed;
    const accel = clamp(desired * 1.8, -5.8, 2.9);
    this.speed = clamp(this.speed + accel * dt, 0, this.speedLimit * 1.22);
    if (this.speed < 0.4 && this.distanceToStop > -5) this.waitTime += dt;
  }

  move(dt) {
    if (!this.active) return;
    this.prevProgress = this.progress;
    this.progress += this.speed * dt;
    if (this.progress >= this.path.total) {
      this.completed = true;
    }
  }

  rewardStep(collision, nearMiss) {
    const progressReward = Math.max(0, this.progress - this.prevProgress) * 0.08;
    let reward = progressReward - (this.speed < 0.4 ? 0.04 : 0);
    if (nearMiss) reward -= 1.8;
    if (collision) reward -= 40;
    if (this.completed) reward += 18;
    this.reward += reward;
    return reward;
  }

  intentPacket() {
    return {
      id: this.id,
      approach: this.approach,
      route: this.route,
      speed: this.speed,
      eta: this.etaToConflict,
      distanceToConflict: this.distanceToConflict,
      priority: this.priority,
    };
  }
}
