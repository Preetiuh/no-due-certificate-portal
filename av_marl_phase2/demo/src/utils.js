export class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  choice(items) {
    return items[Math.floor(this.next() * items.length) % items.length];
  }
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function formatKmh(speedMps) {
  return `${Math.round(speedMps * 3.6)} km/h`;
}

export function rollingPush(array, value, maxLength) {
  array.push(value);
  if (array.length > maxLength) array.shift();
}
