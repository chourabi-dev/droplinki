/**
 * Route planner for the driver app.
 *
 * Deliveries are created by companies now, so the driver no longer decides
 * what exists — the app decides the best ORDER. Inputs are the driver's
 * assigned deliveries plus the driver's live position; output is an ordered,
 * annotated list of stops ("nearest first", improved with 2-opt).
 *
 * Real-world wrinkles handled here:
 *  - Some deliveries have no lat/lng. We fall back to geocoded address, then
 *    to the delegation/governorate centroid (see geocode.ts). Deliveries with
 *    nothing usable are slotted next to other stops of the same delegation,
 *    or grouped at the end, and flagged "position inconnue".
 *  - Customers who can't be there reschedule (Delivery.scheduledFor).
 *      later than today        -> "parked": out of the route
 *      later today, not ready  -> "later": out of the route until ~20 min before
 *      slot reached            -> "due": pulled forward (soft priority)
 *  - Deliveries not yet loaded on the truck (EN-ATT / EN-DEP) are not routable.
 *
 * Pure functions only (no React) so this is easy to unit test.
 */

import { Delivery } from "@/types";
import { distanceKm } from "@/lib/utils";
import { peekGeocode } from "@/lib/geocode";

export interface LatLon {
  lat: number;
  lon: number;
}

export type Precision = "exact" | "address" | "zone" | "none";

export interface Stop {
  delivery: Delivery;
  /** 1-based position in the route. */
  order: number;
  point: LatLon | null;
  precision: Precision;
  /** Estimated road km from the previous located point (or the driver). null when unknown. */
  legKm: number | null;
  /** Cumulative estimated road km up to and including this stop. */
  cumKm: number;
  /** Cumulative minutes from now until arrival (driving + service time at earlier stops). */
  etaMin: number;
  /** The rescheduled slot has arrived (or passed): the customer is expecting the driver. */
  due: boolean;
  reasons: string[];
}

export interface RoutePlan {
  stops: Stop[];
  /** Rescheduled to a later day. */
  parked: Delivery[];
  /** Rescheduled later today, not ready yet (sorted by slot). */
  later: Delivery[];
  /** Not loaded on the truck yet (EN-ATT / EN-DEP). */
  notReady: Delivery[];
  done: Delivery[];
  totalKm: number;
  totalMin: number;
  /** True when the plan started from the driver's real position. */
  fromDriver: boolean;
}

export interface PlanOptions {
  now?: Date;
  origin?: LatLon | null;
  /** A rescheduled delivery re-enters the route this many minutes before its slot. */
  readyLeadMin?: number;
  /** Straight-line -> road distance factor. */
  roadFactor?: number;
  /** Average driving speed in km/h. */
  speedKmh?: number;
  /** Minutes spent at each stop (parking, handover, cash). */
  serviceMin?: number;
}

const NOT_ON_TRUCK = new Set(["EN-ATT", "EN-DEP"]);

export function exactPoint(d: Delivery): LatLon | null {
  const { customerLatitude: lat, customerLongitude: lon } = d;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat === 0 && lon === 0) return null;
  return { lat, lon };
}

export function resolvePoint(d: Delivery): { point: LatLon | null; precision: Precision } {
  const exact = exactPoint(d);
  if (exact) return { point: exact, precision: "exact" };
  const g = peekGeocode({ address: d.address, delegation: d.delegation, gouvernorate: d.gouvernorate });
  if (g) return { point: { lat: g.lat, lon: g.lon }, precision: g.precision === "address" ? "address" : "zone" };
  return { point: null, precision: "none" };
}

function endOfDay(now: Date): number {
  const e = new Date(now);
  e.setHours(23, 59, 59, 999);
  return e.getTime();
}

export function scheduledMs(d: Delivery): number | null {
  if (!d.scheduledFor) return null;
  const t = Date.parse(d.scheduledFor);
  return Number.isNaN(t) ? null : t;
}

const fmtHour = (ms: number) =>
  new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function planRoute(deliveries: Delivery[], opts: PlanOptions = {}): RoutePlan {
  const now = opts.now ?? new Date();
  const nowMs = now.getTime();
  const lead = (opts.readyLeadMin ?? 20) * 60_000;
  const roadFactor = opts.roadFactor ?? 1.3;
  const speed = opts.speedKmh ?? 24;
  const serviceMin = opts.serviceMin ?? 5;
  const origin = opts.origin ?? null;

  const parked: Delivery[] = [];
  const later: Delivery[] = [];
  const notReady: Delivery[] = [];
  const done: Delivery[] = [];
  const ready: { d: Delivery; due: boolean }[] = [];

  for (const d of deliveries) {
    if (d.status === "delivered") {
      done.push(d);
      continue;
    }
    if (NOT_ON_TRUCK.has(d.status)) {
      notReady.push(d);
      continue;
    }
    const at = scheduledMs(d);
    if (at !== null) {
      if (at > endOfDay(now)) {
        parked.push(d);
        continue;
      }
      if (at - lead > nowMs) {
        later.push(d);
        continue;
      }
      ready.push({ d, due: at <= nowMs });
      continue;
    }
    ready.push({ d, due: false });
  }
  later.sort((a, b) => (scheduledMs(a) ?? 0) - (scheduledMs(b) ?? 0));
  parked.sort((a, b) => (scheduledMs(a) ?? 0) - (scheduledMs(b) ?? 0));

  type Node = { d: Delivery; due: boolean; point: LatLon | null; precision: Precision };
  const nodes: Node[] = ready.map(({ d, due }) => ({ d, due, ...resolvePoint(d) }));
  const located = nodes.filter((n) => n.point);
  const unlocated = nodes.filter((n) => !n.point);

  const dist = (a: LatLon, b: LatLon) => distanceKm(a.lat, a.lon, b.lat, b.lon);
  const weight = (n: Node) => {
    if (n.due) return 0.4; // customer is waiting for the slot they asked for
    if (n.precision === "exact" && n.d.status === "location_received") return 0.9;
    if (n.precision === "zone") return 1.1; // centroid only: less reliable
    return 1;
  };

  // --- 1. nearest-neighbour ordering of located stops --------------------
  const remaining = [...located];
  const ordered: Node[] = [];
  let cursor: LatLon | null = origin;
  if (!cursor && remaining.length) {
    // No GPS: start from the stop farthest from the centroid, so the path
    // sweeps across the area instead of starting in the middle.
    const c = {
      lat: remaining.reduce((s, n) => s + n.point!.lat, 0) / remaining.length,
      lon: remaining.reduce((s, n) => s + n.point!.lon, 0) / remaining.length,
    };
    const start = remaining.reduce((best, n) => (dist(c, n.point!) > dist(c, best.point!) ? n : best));
    remaining.splice(remaining.indexOf(start), 1);
    ordered.push(start);
    cursor = start.point;
  }
  while (remaining.length) {
    let bestIdx = 0;
    let bestCost = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cost = dist(cursor!, remaining[i].point!) * weight(remaining[i]);
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    cursor = next.point;
  }

  // --- 2. 2-opt refinement of everything AFTER the first stop --------------
  // The first stop stays the nearest one ("nearest first" is the contract the
  // driver sees); 2-opt then shortens the rest of the path. Open end (no
  // return trip). Skipped when some stops are "due": 2-opt would happily
  // undo the priority we just gave them.
  if (ordered.length > 3 && ordered.length <= 80 && !ordered.some((n) => n.due)) {
    const pts = ordered.map((n) => n.point!);
    let improved = true;
    let guard = 0;
    while (improved && guard++ < 60) {
      improved = false;
      for (let i = 1; i < pts.length - 1; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const before = pts[i - 1];
          const after = j + 1 < pts.length ? pts[j + 1] : null;
          const oldCost = dist(before, pts[i]) + (after ? dist(pts[j], after) : 0);
          const newCost = dist(before, pts[j]) + (after ? dist(pts[i], after) : 0);
          if (newCost + 1e-9 < oldCost) {
            pts.splice(i, j - i + 1, ...pts.slice(i, j + 1).reverse());
            ordered.splice(i, j - i + 1, ...ordered.slice(i, j + 1).reverse());
            improved = true;
          }
        }
      }
    }
  }

  // --- 3. slot deliveries without any position next to their neighbours ---
  const route: Node[] = [...ordered];
  for (const u of unlocated) {
    const sameDelegation = lastIndex(route, (n) => !!u.d.delegationId && n.d.delegationId === u.d.delegationId);
    const idx =
      sameDelegation >= 0
        ? sameDelegation
        : lastIndex(route, (n) => !!u.d.gouvernorateId && n.d.gouvernorateId === u.d.gouvernorateId);
    if (idx >= 0) route.splice(idx + 1, 0, u);
    else route.push(u);
  }

  // --- 4. annotate legs / ETAs -------------------------------------------
  const stops: Stop[] = [];
  let last: LatLon | null = origin;
  let cumKm = 0;
  let cumMin = 0;
  route.forEach((n, i) => {
    let legKm: number | null = null;
    if (n.point && last) {
      legKm = dist(last, n.point) * roadFactor;
      cumKm += legKm;
      cumMin += (legKm / speed) * 60;
    }
    if (n.point) last = n.point;
    const etaMin = Math.round(cumMin);
    cumMin += serviceMin;

    const reasons: string[] = [];
    const at = scheduledMs(n.d);
    if (n.due && at !== null) reasons.push(`Le client vous attend (créneau ${fmtHour(at)})`);
    else if (at !== null) reasons.push(`Créneau demandé à ${fmtHour(at)}`);
    if (legKm !== null && i === 0) reasons.push(`Le plus proche · ${legKm.toFixed(1)} km`);
    if (n.precision === "exact" && n.d.status === "location_received") reasons.push("Position confirmée par le client");
    if (n.precision === "none") reasons.push("Position inconnue · appelez le client");
    if (n.precision === "zone") reasons.push("Zone approximative seulement");
    if (n.precision === "address") reasons.push("Position estimée depuis l'adresse");
    const prev = route[i - 1];
    if (prev && n.d.delegationId && prev.d.delegationId === n.d.delegationId && i > 0)
      reasons.push("Même zone que l'arrêt précédent");
    if (n.d.rescheduleCount) reasons.push(`Déjà reportée ${n.d.rescheduleCount}×`);

    stops.push({
      delivery: n.d,
      order: i + 1,
      point: n.point,
      precision: n.precision,
      legKm,
      cumKm,
      etaMin,
      due: n.due,
      reasons,
    });
  });

  return {
    stops,
    parked,
    later,
    notReady,
    done,
    totalKm: cumKm,
    totalMin: Math.round(cumMin),
    fromDriver: !!origin,
  };
}

function lastIndex<T>(arr: T[], pred: (t: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export interface Suggestions {
  /** What to do next. */
  best: Stop | null;
  /** Nearby alternatives if the driver prefers to deviate, closest first. */
  alternatives: { stop: Stop; directKm: number }[];
}

export function suggest(plan: RoutePlan, origin?: LatLon | null): Suggestions {
  const best = plan.stops[0] ?? null;
  if (!best) return { best: null, alternatives: [] };
  const alternatives = origin
    ? plan.stops
        .slice(1)
        .filter((s) => s.point)
        .map((s) => ({ stop: s, directKm: distanceKm(origin.lat, origin.lon, s.point!.lat, s.point!.lon) * 1.3 }))
        .sort((a, b) => a.directKm - b.directKm)
        .slice(0, 2)
    : [];
  return { best, alternatives };
}

// ---------------------------------------------------------------------------
// Formatting + navigation links
// ---------------------------------------------------------------------------

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function addressText(d: Delivery): string {
  return [d.address, d.delegation, d.gouvernorate, "Tunisie"].filter((x) => x && x.trim()).join(", ");
}

/** Coordinates when we have the real ones, otherwise the address text (Google Maps geocodes it itself, better than our centroid). */
export function navTarget(d: Delivery): string | null {
  const p = exactPoint(d);
  if (p) return `${p.lat},${p.lon}`;
  const a = addressText(d);
  return d.address?.trim() || d.delegation ? a : null;
}

export function navigateUrl(d: Delivery): string | null {
  const t = navTarget(d);
  if (!t) return null;
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(t)}`;
}

/** Multi-stop Google Maps link for the next stops (Google allows 9 waypoints + destination). */
export function routeUrl(stops: Stop[], max = 10): string | null {
  const targets = stops
    .map((s) => navTarget(s.delivery))
    .filter((t): t is string => !!t)
    .slice(0, max);
  if (targets.length === 0) return null;
  const destination = targets[targets.length - 1];
  const waypoints = targets.slice(0, -1);
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(destination)}`;
  if (waypoints.length) url += `&waypoints=${encodeURIComponent(waypoints.join("|"))}`;
  return url;
}
