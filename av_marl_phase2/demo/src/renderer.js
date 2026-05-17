import { CANVAS, COLORS, WORLD } from "./config.js";
import { signalForApproach } from "./signals.js";
import { toCanvas } from "./roadNetwork.js";
import { formatKmh } from "./utils.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  draw(world) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
    this.drawMap(ctx);
    this.drawSignals(ctx, world);
    this.drawCommunication(ctx, world);
    this.drawVehicles(ctx, world);
    this.drawOverlay(ctx, world);
  }

  drawMap(ctx) {
    ctx.fillStyle = "#dfe7ef";
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

    const roadW = 154;
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(CANVAS.centerX - roadW / 2, 0, roadW, CANVAS.height);
    ctx.fillRect(0, CANVAS.centerY - roadW / 2, CANVAS.width, roadW);

    ctx.strokeStyle = COLORS.roadEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(CANVAS.centerX - roadW / 2, -2, roadW, CANVAS.height + 4);
    ctx.strokeRect(-2, CANVAS.centerY - roadW / 2, CANVAS.width + 4, roadW);

    ctx.setLineDash([18, 18]);
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CANVAS.centerX, 0);
    ctx.lineTo(CANVAS.centerX, CANVAS.height);
    ctx.moveTo(0, CANVAS.centerY);
    ctx.lineTo(CANVAS.width, CANVAS.centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 3;
    for (const point of [
      { x: -WORLD.laneOffset, y: WORLD.stopOffset },
      { x: WORLD.stopOffset, y: WORLD.laneOffset },
      { x: WORLD.laneOffset, y: -WORLD.stopOffset },
      { x: -WORLD.stopOffset, y: -WORLD.laneOffset },
    ]) {
      const c = toCanvas(point);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    const conflict = toCanvas({ x: 0, y: 0 });
    ctx.strokeStyle = "rgba(228,87,46,0.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(conflict.x, conflict.y, WORLD.conflictRadius * CANVAS.scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawSignals(ctx, world) {
    const signalPoints = [
      ["north", { x: -24, y: 24 }],
      ["east", { x: 24, y: 24 }],
      ["south", { x: 24, y: -24 }],
      ["west", { x: -24, y: -24 }],
    ];
    for (const [approach, point] of signalPoints) {
      const state = signalForApproach(approach, world.time);
      const c = toCanvas(point);
      ctx.fillStyle = state === "green" ? COLORS.green : state === "yellow" ? COLORS.amber : COLORS.red;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawCommunication(ctx, world) {
    if (!world.v2vEnabled) return;
    const active = world.vehicles.filter((vehicle) => vehicle.active && vehicle.sideThreat);
    ctx.strokeStyle = "rgba(19,183,166,0.42)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 8]);
    for (const vehicle of active) {
      const other = world.vehicles.find((item) => item.id === vehicle.sideThreat?.id);
      if (!other || !other.active) continue;
      const a = toCanvas(vehicle.position);
      const b = toCanvas(other.position);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  drawVehicles(ctx, world) {
    for (const vehicle of world.vehicles) {
      const pos = toCanvas(vehicle.position);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(-vehicle.heading);
      const color = vehicle.crashed
        ? COLORS.red
        : vehicle.priority
          ? COLORS.coordinated
          : world.mode === "learning"
            ? COLORS.learning
            : world.mode === "noncoordinated"
              ? COLORS.noncoordinated
              : COLORS.vehicle;
      ctx.fillStyle = color;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.5;
      const w = WORLD.vehicleLength * CANVAS.scale;
      const h = WORLD.vehicleWidth * CANVAS.scale;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillRect(w * 0.1, -h * 0.3, w * 0.2, h * 0.6);
      ctx.restore();

      ctx.fillStyle = COLORS.ink;
      ctx.font = "11px Segoe UI, Arial";
      ctx.fillText(vehicle.id, pos.x + 11, pos.y - 8);
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(formatKmh(vehicle.speed), pos.x + 11, pos.y + 7);
    }
  }

  drawOverlay(ctx, world) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "rgba(17,24,39,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(CANVAS.width - 294, 18, 270, 92, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.font = "700 14px Segoe UI, Arial";
    ctx.fillText(`Active vehicles: ${world.vehicles.filter((v) => v.active).length}`, CANVAS.width - 274, 45);
    ctx.fillText(`Average speed: ${Math.round(world.averageSpeedKmh())} km/h`, CANVAS.width - 274, 70);
    ctx.fillText(`Cooperative yields: ${world.metrics.cooperativeYields}`, CANVAS.width - 274, 95);
  }
}
