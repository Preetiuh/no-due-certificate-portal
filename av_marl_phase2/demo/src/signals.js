import { signalAxis } from "./roadNetwork.js";

const CYCLE = 36;
const NS_GREEN = 13;
const NS_YELLOW = 16;
const EW_GREEN = 31;
const EW_YELLOW = 34;

export function signalForApproach(approach, timeSeconds) {
  const t = ((timeSeconds % CYCLE) + CYCLE) % CYCLE;
  const axis = signalAxis(approach);
  if (axis === "ns") {
    if (t < NS_GREEN) return "green";
    if (t < NS_YELLOW) return "yellow";
    return "red";
  }
  if (t >= NS_YELLOW && t < EW_GREEN) return "green";
  if (t >= EW_GREEN && t < EW_YELLOW) return "yellow";
  return "red";
}

export function signalSummary(timeSeconds) {
  const north = signalForApproach("north", timeSeconds);
  const east = signalForApproach("east", timeSeconds);
  if (north === "green") return "North-South green";
  if (east === "green") return "East-West green";
  if (north === "yellow") return "North-South yellow";
  if (east === "yellow") return "East-West yellow";
  return "All-red clearance";
}

export function secondsToNextGreen(approach, timeSeconds) {
  for (let offset = 0; offset <= CYCLE; offset += 0.5) {
    if (signalForApproach(approach, timeSeconds + offset) === "green") return offset;
  }
  return CYCLE;
}
