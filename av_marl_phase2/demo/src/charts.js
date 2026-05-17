import { COLORS } from "./config.js";

export function drawComparisonChart(canvas, comparison) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  if (!comparison) {
    drawEmpty(ctx, w, h, "Run comparison to generate safety and flow bars");
    return;
  }

  const metrics = [
    ["Throughput/min", "throughput", 18],
    ["Safety Risk", "risk", 18],
    ["Avg Wait", "avgWait", 9],
    ["Avg Speed", "avgSpeed", 72],
  ];
  const maxValues = metrics.map(([, key, softMax]) =>
    Math.max(readMetric(comparison.coordinated, key), readMetric(comparison.noncoordinated, key), softMax),
  );
  const groupW = w / metrics.length;
  ctx.font = "12px Segoe UI, Arial";
  metrics.forEach(([label, key], index) => {
    const x = index * groupW + 30;
    const base = h - 38;
    const max = maxValues[index];
    const coordinatedValue = readMetric(comparison.coordinated, key);
    const nonCoordinatedValue = readMetric(comparison.noncoordinated, key);
    const cH = (coordinatedValue / max) * 132;
    const nH = (nonCoordinatedValue / max) * 132;
    ctx.fillStyle = COLORS.coordinated;
    ctx.fillRect(x, base - cH, 30, cH);
    ctx.fillStyle = COLORS.noncoordinated;
    ctx.fillRect(x + 38, base - nH, 30, nH);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(label, x - 8, h - 13);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(formatMetric(coordinatedValue, key), x - 1, base - cH - 8);
    ctx.fillText(formatMetric(nonCoordinatedValue, key), x + 36, base - nH - 8);
  });
  legend(ctx, 22, 20);
}

function readMetric(row, key) {
  const fallback = {
    throughput: row.completed,
    risk: row.collisions,
    avgSpeed: row.flow,
  };
  return Number(row[key] ?? fallback[key] ?? 0);
}

function formatMetric(value, key) {
  if (key === "avgSpeed") return `${Math.round(value)} km/h`;
  if (key === "avgWait") return `${value.toFixed(1)}s`;
  return String(Math.round(value * 10) / 10);
}

export function drawTimelineChart(canvas, timeline) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  if (!timeline.length) {
    drawEmpty(ctx, w, h, "Live safety and flow history will appear here");
    return;
  }

  const plot = { x: 38, y: 22, w: w - 58, h: h - 56 };
  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = plot.y + (plot.h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
  }

  drawLine(ctx, timeline.map((row) => row.flow), plot, COLORS.coordinated);
  drawLine(ctx, timeline.map((row) => row.wait), plot, COLORS.amber);
  drawLine(ctx, timeline.map((row) => row.collisions), plot, COLORS.red);
  ctx.fillStyle = COLORS.coordinated;
  ctx.fillText("Flow", 44, h - 16);
  ctx.fillStyle = COLORS.amber;
  ctx.fillText("Wait", 94, h - 16);
  ctx.fillStyle = COLORS.red;
  ctx.fillText("Collisions", 144, h - 16);
}

function drawLine(ctx, values, plot, color) {
  const max = Math.max(...values, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = plot.x + (plot.w * index) / Math.max(values.length - 1, 1);
    const y = plot.y + plot.h - (value / max) * plot.h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawEmpty(ctx, w, h, message) {
  ctx.fillStyle = COLORS.muted;
  ctx.font = "14px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText(message, w / 2, h / 2);
  ctx.textAlign = "start";
}

function legend(ctx, x, y) {
  ctx.font = "12px Segoe UI, Arial";
  ctx.fillStyle = COLORS.coordinated;
  ctx.fillRect(x, y - 10, 12, 12);
  ctx.fillStyle = COLORS.ink;
  ctx.fillText("Coordinated", x + 18, y);
  ctx.fillStyle = COLORS.noncoordinated;
  ctx.fillRect(x + 118, y - 10, 12, 12);
  ctx.fillStyle = COLORS.ink;
  ctx.fillText("Non-coordinated", x + 136, y);
}
