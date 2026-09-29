/**
 * Best-effort geocoding for deliveries that have no customerLatitude /
 * customerLongitude (companies often only know the address).
 *
 * Uses OpenStreetMap Nominatim from the browser, restricted to Tunisia, with:
 *  - a persistent localStorage cache (never ask twice for the same query),
 *  - a 1 request / second queue (Nominatim usage policy),
 *  - a fallback chain address -> delegation -> governorate, so every delivery
 *    that has at least a zone still gets an approximate point for routing.
 *
 * The result always carries its precision so the UI can be honest about it.
 */

export type GeoPrecision = "address" | "zone";

export interface GeoPoint {
  lat: number;
  lon: number;
  precision: GeoPrecision;
}

const CACHE_KEY = "droplink:driver:geocode:v1";
// Rough Tunisia bounding box — rejects results that landed in another country.
const TN = { minLat: 30.1, maxLat: 37.6, minLon: 7.4, maxLon: 11.7 };

type CacheValue = { lat: number; lon: number } | null; // null = looked up, nothing found
let cache: Record<string, CacheValue> | null = null;

function loadCache(): Record<string, CacheValue> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    cache = {};
  }
  return cache!;
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full / private mode — cache stays in memory only */
  }
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/[,;]+/g, ",").trim();
}

let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function nominatim(query: string): Promise<CacheValue> {
  const run = async (): Promise<CacheValue> => {
    const wait = Math.max(0, 1100 - (Date.now() - lastCall));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tn&accept-language=fr&q=" +
      encodeURIComponent(query);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const hit = rows[0];
    if (!hit) return null;
    const lat = parseFloat(hit.lat);
    const lon = parseFloat(hit.lon);
    if (lat < TN.minLat || lat > TN.maxLat || lon < TN.minLon || lon > TN.maxLon) return null;
    return { lat, lon };
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

async function cached(query: string): Promise<CacheValue | undefined> {
  const c = loadCache();
  const key = norm(query);
  if (key in c) return c[key];
  try {
    const v = await nominatim(query);
    c[key] = v;
    saveCache();
    return v;
  } catch {
    // Network / rate-limit error: do NOT cache, so we retry next time.
    return undefined;
  }
}

/** Synchronous read of whatever we already know (used by the route planner on every render). */
export function peekGeocode(d: { address?: string; delegation?: string; gouvernorate?: string }): GeoPoint | null {
  const c = loadCache();
  for (const q of queries(d)) {
    const v = c[norm(q.text)];
    if (v) return { ...v, precision: q.precision };
  }
  return null;
}

function queries(d: { address?: string; delegation?: string; gouvernorate?: string }) {
  const out: { text: string; precision: GeoPrecision }[] = [];
  const zone = [d.delegation, d.gouvernorate].filter(Boolean).join(", ");
  if (d.address?.trim() && zone) out.push({ text: `${d.address.trim()}, ${zone}, Tunisie`, precision: "address" });
  else if (d.address?.trim()) out.push({ text: `${d.address.trim()}, Tunisie`, precision: "address" });
  if (d.delegation && d.gouvernorate) out.push({ text: `${d.delegation}, ${d.gouvernorate}, Tunisie`, precision: "zone" });
  if (d.gouvernorate) out.push({ text: `${d.gouvernorate}, Tunisie`, precision: "zone" });
  return out;
}

/** Async resolution through the fallback chain. Returns null when nothing could be found. */
export async function geocodeDelivery(d: {
  address?: string;
  delegation?: string;
  gouvernorate?: string;
}): Promise<GeoPoint | null> {
  for (const q of queries(d)) {
    const v = await cached(q.text);
    if (v === undefined) return null; // transient failure, try again later
    if (v) return { ...v, precision: q.precision };
  }
  return null;
}
