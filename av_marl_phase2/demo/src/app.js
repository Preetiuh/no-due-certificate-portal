import { MODE_LABELS, WORLD } from "./config.js";
import { Renderer } from "./renderer.js";
import { SimulationWorld } from "./simulation.js";
import { drawComparisonChart, drawTimelineChart } from "./charts.js?v=traffic-graph-v3";
import { formatKmh } from "./utils.js";
import { signalSummary } from "./signals.js";

const canvas = document.querySelector("#world");
const renderer = new Renderer(canvas);
const world = new SimulationWorld({ mode: "coordinated", seed: 77 });
world.reset();

const state = {
  running: true,
  lastFrame: performance.now(),
  comparison: null,
  comparisonWorlds: null,
  comparisonSeed: 2030,
  lastComparisonPaint: 0,
  locationWatchId: null,
  liveLocation: null,
};

const elements = {
  toggleRun: document.querySelector("#toggleRun"),
  resetRun: document.querySelector("#resetRun"),
  runComparison: document.querySelector("#runComparison"),
  density: document.querySelector("#density"),
  densityValue: document.querySelector("#densityValue"),
  speedLimit: document.querySelector("#speedLimit"),
  speedValue: document.querySelector("#speedValue"),
  v2vToggle: document.querySelector("#v2vToggle"),
  shieldToggle: document.querySelector("#shieldToggle"),
  signalToggle: document.querySelector("#signalToggle"),
  locationText: document.querySelector("#locationText"),
  useLocation: document.querySelector("#useLocation"),
  stopLocation: document.querySelector("#stopLocation"),
  latValue: document.querySelector("#latValue"),
  lngValue: document.querySelector("#lngValue"),
  accuracyValue: document.querySelector("#accuracyValue"),
  policyName: document.querySelector("#policyName"),
  signalState: document.querySelector("#signalState"),
  decisionText: document.querySelector("#decisionText"),
  completedMetric: document.querySelector("#completedMetric"),
  collisionMetric: document.querySelector("#collisionMetric"),
  waitMetric: document.querySelector("#waitMetric"),
  flowMetric: document.querySelector("#flowMetric"),
  telemetryBody: document.querySelector("#telemetryBody"),
  comparisonChart: document.querySelector("#comparisonChart"),
  timelineChart: document.querySelector("#timelineChart"),
};

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    resetWorld({ mode: button.dataset.mode });
  });
});

elements.toggleRun.addEventListener("click", () => {
  state.running = !state.running;
  elements.toggleRun.textContent = state.running ? "Pause" : "Resume";
  elements.toggleRun.classList.toggle("primary", state.running);
});

elements.resetRun.addEventListener("click", () => resetWorld());
elements.runComparison.addEventListener("click", () => resetLiveComparison(Math.floor(Date.now() % 100000)));
elements.density.addEventListener("input", handleControlChange);
elements.speedLimit.addEventListener("input", handleControlChange);
elements.v2vToggle.addEventListener("change", handleControlChange);
elements.shieldToggle.addEventListener("change", handleControlChange);
elements.signalToggle.addEventListener("change", handleControlChange);
elements.useLocation.addEventListener("click", startLocationTracking);
elements.stopLocation.addEventListener("click", stopLocationTracking);

function syncControls() {
  world.density = Number(elements.density.value);
  world.speedLimitKmh = Number(elements.speedLimit.value);
  world.v2vEnabled = elements.v2vToggle.checked;
  world.safetyShield = elements.shieldToggle.checked;
  world.signalAwareness = elements.signalToggle.checked;
  for (const vehicle of world.vehicles) {
    vehicle.speedLimit = world.speedLimitKmh / 3.6;
  }
  elements.densityValue.textContent = `${Math.round(world.density * 100)}%`;
  elements.speedValue.textContent = `${world.speedLimitKmh} km/h`;
}

function handleControlChange() {
  syncControls();
  resetLiveComparison(state.comparisonSeed);
}

function resetWorld(overrides = {}) {
  syncControls();
  const seed = Math.floor(Date.now() % 100000);
  world.reset({
    mode: overrides.mode ?? world.mode,
    density: Number(elements.density.value),
    speedLimitKmh: Number(elements.speedLimit.value),
    v2vEnabled: elements.v2vToggle.checked,
    safetyShield: elements.shieldToggle.checked,
    signalAwareness: elements.signalToggle.checked,
    seed,
  });
  updateModeLabels();
  resetLiveComparison(seed + 17);
}

function resetLiveComparison(seed = state.comparisonSeed) {
  syncControls();
  state.comparisonSeed = seed;
  const shared = {
    density: world.density,
    speedLimitKmh: world.speedLimitKmh,
    v2vEnabled: elements.v2vToggle.checked,
    safetyShield: elements.shieldToggle.checked,
    signalAwareness: elements.signalToggle.checked,
  };
  const coordinated = new SimulationWorld({ ...shared, mode: "coordinated", seed });
  const noncoordinated = new SimulationWorld({ ...shared, mode: "noncoordinated", seed });
  coordinated.reset();
  noncoordinated.reset();
  state.comparisonWorlds = { coordinated, noncoordinated };
  state.comparison = buildLiveComparison();
  drawComparisonChart(elements.comparisonChart, state.comparison);
}

function advanceLiveComparison(dt) {
  if (!state.comparisonWorlds) resetLiveComparison();
  const steps = Math.max(1, Math.round(dt / 0.05));
  for (let i = 0; i < steps; i += 1) {
    state.comparisonWorlds.coordinated.step(dt / steps);
    state.comparisonWorlds.noncoordinated.step(dt / steps);
  }
  state.comparison = buildLiveComparison();
}

function buildLiveComparison() {
  return {
    coordinated: adaptiveComparisonSnapshot(state.comparisonWorlds.coordinated),
    noncoordinated: adaptiveComparisonSnapshot(state.comparisonWorlds.noncoordinated),
  };
}

function adaptiveComparisonSnapshot(simWorld) {
  const snap = simWorld.snapshot();
  const active = simWorld.vehicles.filter((vehicle) => vehicle.active);
  const activeCount = Math.max(active.length, 1);
  const avgSpeedKmh = active.length
    ? active.reduce((sum, vehicle) => sum + vehicle.speed * 3.6, 0) / active.length
    : snap.avgSpeedKmh;
  const sidePressure = active.filter((vehicle) => vehicle.sideThreat && vehicle.distanceToConflict < 60).length;
  const gapPressure = active.filter(
    (vehicle) => Number.isFinite(vehicle.frontGap) && vehicle.frontGap < WORLD.minFrontGap * 2.6,
  ).length;
  const signalPressure = active.reduce((sum, vehicle) => {
    const approachingStop = vehicle.distanceToStop > -8 && vehicle.distanceToStop < 78;
    if (!approachingStop) return sum;
    if (vehicle.signal === "red") return sum + 1.2;
    if (vehicle.signal === "yellow") return sum + 0.65;
    return sum;
  }, 0);
  const stoppedPressure = active.filter((vehicle) => vehicle.speed < 0.6 && vehicle.distanceToStop > -8).length;
  const speedDrop = Math.max(0, simWorld.speedLimitKmh - avgSpeedKmh) / Math.max(simWorld.speedLimitKmh, 1);
  const densityLoad = activeCount * Math.max(0.35, simWorld.density);
  const throughput = snap.flow * (0.9 + Math.min(avgSpeedKmh / Math.max(simWorld.speedLimitKmh, 1), 1.15) * 0.18);
  const risk =
    snap.collisions * 2.25 +
    snap.nearMisses * 0.35 +
    sidePressure * 1.25 +
    gapPressure * 0.7 +
    signalPressure * 0.45 +
    stoppedPressure * 0.25 +
    densityLoad * 0.12 +
    speedDrop * 3.2;

  return {
    ...snap,
    throughput,
    risk,
    avgWait: snap.avgWait + signalPressure * 0.04 + stoppedPressure * 0.08,
    avgSpeed: avgSpeedKmh,
  };
}

async function initializeLocationState() {
  if (!navigator.geolocation) {
    elements.locationText.textContent =
      "Geolocation is not available in this browser. Open the demo in Chrome or Edge from http://127.0.0.1:8765/ for live GPS tracking.";
    return;
  }

  const permissionState = await readGeoPermission();
  if (permissionState === "granted") {
    elements.locationText.textContent = "Location permission is already allowed. Starting live GPS tracking...";
    startLocationTracking();
    return;
  }

  if (permissionState === "denied") {
    elements.locationText.textContent =
      "Location is blocked for this page. Allow Location from the browser site controls, then press Start Live Tracking.";
    return;
  }

  elements.locationText.textContent =
    "Live GPS tracking is ready. Press Start Live Tracking and choose Allow when the browser asks.";
}

async function startLocationTracking() {
  if (!navigator.geolocation) {
    elements.locationText.textContent =
      "Geolocation is not available in this browser. Open the demo in Chrome or Edge from http://127.0.0.1:8765/ for live GPS tracking.";
    return;
  }

  if (state.locationWatchId !== null) {
    elements.locationText.textContent = "Live location tracking is already active.";
    return;
  }

  const permissionState = await readGeoPermission();
  if (permissionState === "denied") {
    elements.locationText.textContent =
      "Location is blocked by the browser. Click the site/location icon near the address bar, allow Location, then press Start Live Tracking again.";
    return;
  }

  elements.locationText.textContent =
    permissionState === "prompt"
      ? "Waiting for browser permission. Choose Allow to enable live location tracking."
      : "Starting live location tracking...";
  elements.useLocation.disabled = true;
  elements.stopLocation.disabled = false;

  state.locationWatchId = navigator.geolocation.watchPosition(
    handleLocationUpdate,
    handleLocationError,
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 1000,
    },
  );
}

function stopLocationTracking(preserveMessage = false) {
  if (state.locationWatchId !== null) {
    navigator.geolocation.clearWatch(state.locationWatchId);
  }
  state.locationWatchId = null;
  elements.useLocation.disabled = false;
  elements.stopLocation.disabled = true;
  if (preserveMessage) return;
  elements.locationText.textContent = state.liveLocation
    ? "Live tracking stopped. Last known route origin remains available."
    : "Location tracking stopped.";
}

async function readGeoPermission() {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" });
    status.onchange = () => {
      if (status.state === "denied") {
        stopLocationTracking();
        elements.locationText.textContent =
          "Location permission changed to blocked. Allow Location from the browser site controls to resume live tracking.";
      }
    };
    return status.state;
  } catch {
    return "unknown";
  }
}

function handleLocationUpdate(position) {
  const { latitude, longitude, accuracy, speed, heading } = position.coords;
  state.liveLocation = {
    latitude,
    longitude,
    accuracy,
    speed,
    heading,
    updatedAt: new Date(position.timestamp),
  };
  elements.latValue.textContent = latitude.toFixed(6);
  elements.lngValue.textContent = longitude.toFixed(6);
  elements.accuracyValue.textContent = `${Math.round(accuracy)} m`;
  const speedText = Number.isFinite(speed) && speed !== null ? `, device speed ${Math.round(speed * 3.6)} km/h` : "";
  const headingText = Number.isFinite(heading) && heading !== null ? `, heading ${Math.round(heading)} deg` : "";
  elements.locationText.textContent =
    `Live location enabled: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} ` +
    `within about ${Math.round(accuracy)} m${speedText}${headingText}. Simulation route origin is linked to this position.`;
}

function handleLocationError(error) {
  const messageByCode = {
    1: "Location permission was denied. Allow Location for this site from the browser address-bar controls.",
    2: "Location is currently unavailable from the device. Turn on Windows Location Services or try a browser with location permission enabled.",
    3: "Location request timed out. Keep the page open and press Start Live Tracking again.",
  };
  elements.locationText.textContent = messageByCode[error.code] ?? "Live location could not be started.";
  stopLocationTracking(true);
}

function frame(now) {
  const elapsed = Math.min((now - state.lastFrame) / 1000, 0.08);
  state.lastFrame = now;
  if (state.running) {
    const steps = Math.max(1, Math.round(elapsed / 0.025));
    for (let i = 0; i < steps; i += 1) world.step(elapsed / steps);
    advanceLiveComparison(elapsed);
  }
  renderer.draw(world);
  updateHud();
  if (now - state.lastComparisonPaint > 180) {
    drawComparisonChart(elements.comparisonChart, state.comparison);
    state.lastComparisonPaint = now;
  }
  requestAnimationFrame(frame);
}

function updateHud() {
  updateModeLabels();
  elements.signalState.textContent = signalSummary(world.time);
  elements.decisionText.textContent = world.latestDecision;
  const snap = world.snapshot();
  elements.completedMetric.textContent = String(snap.completed);
  elements.collisionMetric.textContent = String(snap.collisions);
  elements.waitMetric.textContent = `${snap.avgWait.toFixed(1)}s`;
  elements.flowMetric.textContent = snap.flow.toFixed(2);
  updateTelemetry();
  drawTimelineChart(elements.timelineChart, world.timeline);
}

function updateModeLabels() {
  elements.policyName.textContent = MODE_LABELS[world.mode] ?? world.mode;
}

function updateTelemetry() {
  const rows = world.vehicles
    .filter((vehicle) => vehicle.active)
    .slice(0, 9)
    .map((vehicle) => {
      const threat = vehicle.sideThreat ? `; side ${vehicle.sideThreat.id} ${Math.round(vehicle.sideThreat.speed * 3.6)} km/h` : "";
      return `
        <tr>
          <td>${vehicle.id}</td>
          <td>${formatKmh(vehicle.speed)}</td>
          <td>${vehicle.signal}</td>
          <td>${vehicle.actionLabel}${threat}</td>
        </tr>
      `;
    })
    .join("");
  elements.telemetryBody.innerHTML = rows || '<tr><td colspan="4">Vehicles are spawning...</td></tr>';
}

syncControls();
resetLiveComparison();
initializeLocationState();
requestAnimationFrame(frame);
