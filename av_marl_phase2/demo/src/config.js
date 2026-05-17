export const CANVAS = {
  width: 1120,
  height: 760,
  scale: 3.1,
  centerX: 560,
  centerY: 380,
};

export const WORLD = {
  spawnDistance: 118,
  exitDistance: 122,
  laneOffset: 5.5,
  stopOffset: 18,
  conflictRadius: 13,
  vehicleLength: 5.2,
  vehicleWidth: 2.4,
  minFrontGap: 11,
  safeTimeGap: 2.8,
  nearMissMeters: 8,
  spawnCooldown: 1.25,
  defaultSpeedLimitKmh: 52,
};

export const APPROACHES = ["north", "east", "south", "west"];

export const ROUTES = ["straight", "right", "left"];

export const COLORS = {
  road: "#313946",
  roadEdge: "#111827",
  lane: "#edf2f7",
  vehicle: "#2684ff",
  vehicleDark: "#1455a6",
  coordinated: "#13b7a6",
  learning: "#7c3aed",
  signal: "#2e8b57",
  noncoordinated: "#e4572e",
  amber: "#f59e0b",
  red: "#e4572e",
  green: "#2e8b57",
  white: "#ffffff",
  muted: "#637083",
  ink: "#111827",
};

export const MODE_LABELS = {
  coordinated: "Coordinated V2V",
  noncoordinated: "Non-Coordinated",
  signal: "Signal Rules",
  learning: "RL Learning",
};

export const ACTIONS = {
  brake: 0,
  yield: 1,
  cruise: 2,
  go: 3,
};

export const ACTION_LABELS = ["Brake", "Yield", "Cruise", "Go"];
