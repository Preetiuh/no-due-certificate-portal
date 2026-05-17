import { APPROACHES, CANVAS, WORLD } from "./config.js";
import { dist, lerp } from "./utils.js";

const L = WORLD.laneOffset;
const S = WORLD.spawnDistance;
const E = WORLD.exitDistance;
const STOP = WORLD.stopOffset;

const STARTS = {
  north: { x: -L, y: S },
  east: { x: S, y: L },
  south: { x: L, y: -S },
  west: { x: -S, y: -L },
};

const STOPS = {
  north: { x: -L, y: STOP },
  east: { x: STOP, y: L },
  south: { x: L, y: -STOP },
  west: { x: -STOP, y: -L },
};

const EXITS = {
  north: { x: L, y: E },
  east: { x: E, y: -L },
  south: { x: -L, y: -E },
  west: { x: -E, y: L },
};

const EXIT_FOR = {
  north: { straight: "south", right: "west", left: "east" },
  east: { straight: "west", right: "north", left: "south" },
  south: { straight: "north", right: "east", left: "west" },
  west: { straight: "east", right: "south", left: "north" },
};

export function makePath(approach, route) {
  const exit = EXIT_FOR[approach][route];
  const centerBias = turnBiasPoint(approach, exit, route);
  const points = [STARTS[approach], STOPS[approach], centerBias, EXITS[exit]];
  const segments = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const length = dist(from, to);
    segments.push({ from, to, length, start: total, end: total + length });
    total += length;
  }

  return {
    points,
    segments,
    total,
    stopProgress: segments[0].length,
    conflictProgress: segments[0].length + Math.max(segments[1].length * 0.55, 2),
    exit,
  };
}

function turnBiasPoint(approach, exit, route) {
  if (route === "straight") return { x: 0, y: 0 };
  const stop = STOPS[approach];
  const exitPoint = EXITS[exit];
  return {
    x: (stop.x + exitPoint.x) * 0.22,
    y: (stop.y + exitPoint.y) * 0.22,
  };
}

export function pointAt(path, progress) {
  const clamped = Math.max(0, Math.min(path.total, progress));
  const segment = path.segments.find((item) => clamped <= item.end) ?? path.segments[path.segments.length - 1];
  const t = segment.length === 0 ? 0 : (clamped - segment.start) / segment.length;
  return {
    x: lerp(segment.from.x, segment.to.x, t),
    y: lerp(segment.from.y, segment.to.y, t),
  };
}

export function headingAt(path, progress) {
  const clamped = Math.max(0, Math.min(path.total, progress));
  const segment = path.segments.find((item) => clamped <= item.end) ?? path.segments[path.segments.length - 1];
  return Math.atan2(segment.to.y - segment.from.y, segment.to.x - segment.from.x);
}

export function toCanvas(point) {
  return {
    x: CANVAS.centerX + point.x * CANVAS.scale,
    y: CANVAS.centerY - point.y * CANVAS.scale,
  };
}

export function fromCanvas(point) {
  return {
    x: (point.x - CANVAS.centerX) / CANVAS.scale,
    y: (CANVAS.centerY - point.y) / CANVAS.scale,
  };
}

export function signalAxis(approach) {
  return approach === "north" || approach === "south" ? "ns" : "ew";
}

export function approachIndex(approach) {
  return APPROACHES.indexOf(approach);
}

export function pathsConflict(a, b) {
  if (a.approach === b.approach) return true;
  const aExit = a.path.exit;
  const bExit = b.path.exit;
  if (a.route === "right" && b.route === "right") return false;
  if (aExit === b.approach && bExit === a.approach && a.route === "straight" && b.route === "straight") {
    return false;
  }
  return true;
}
