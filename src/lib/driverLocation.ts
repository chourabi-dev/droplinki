import { ApiError, DriverLocationInput, driverApi } from "@/lib/api";

/**
 * Driver position reporting: one-shot GPS reads + an offline-safe send queue.
 *
 * Every fix is first written to a small per-driver queue in localStorage, then
 * the queue is flushed to the API oldest-first. If the network is down or the
 * server errors, the points stay queued and go out on the next attempt (next
 * app open, next tick, or the browser's "online" event), so the company's
 * movements map has no holes just because the driver lost signal for a while.
 */

const QUEUE_PREFIX = "droplink:locationQueue:";
/** Hard cap so a long outage can't grow storage without bound (oldest dropped first). */
const MAX_QUEUE = 500;

export interface PositionOptions2 {
  highAccuracy?: boolean;
  /** Accept a cached fix no older than this many ms. */
  maxAgeMs?: number;
  timeoutMs?: number;
}

/** Promise wrapper around getCurrentPosition. Rejects with the GeolocationPositionError. */
export function getPosition({ highAccuracy = true, maxAgeMs = 5000, timeoutMs = 15000 }: PositionOptions2 = {}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation-unsupported"));
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        maximumAge: maxAgeMs,
        timeout: timeoutMs,
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function toLocationInput(pos: GeolocationPosition): DriverLocationInput {
  const speedMs = pos.coords.speed;
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    recordedAt: new Date(pos.timestamp || Date.now()).toISOString(),
    accuracy: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : undefined,
    speedKmh: speedMs != null && Number.isFinite(speedMs) ? Math.round(speedMs * 3.6 * 10) / 10 : undefined,
  };
}

function readQueue(key: string): DriverLocationInput[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(key: string, queue: DriverLocationInput[]) {
  try {
    if (queue.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // storage full / unavailable: sending still works, we just lose offline retry
  }
}

/** Errors worth retrying later. Any other 4xx means the server will never accept this point. */
function isRetryable(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status === 0 || err.status === 401 || err.status === 408 || err.status === 429 || err.status >= 500;
}

const flushing = new Set<string>();

/** Adds a point to the driver's queue and tries to send everything that is pending. */
export async function reportLocation(driverKey: string, point: DriverLocationInput): Promise<void> {
  const key = QUEUE_PREFIX + driverKey;
  writeQueue(key, [...readQueue(key), point]);
  await flushLocations(driverKey);
}

/** Sends queued points oldest-first; stops at the first retryable failure. */
export async function flushLocations(driverKey: string): Promise<void> {
  const key = QUEUE_PREFIX + driverKey;
  if (flushing.has(key)) return;
  flushing.add(key);
  try {
    // Re-read each loop: new points may be appended while a request is in flight.
    for (;;) {
      const queue = readQueue(key);
      if (queue.length === 0) return;
      try {
        await driverApi.sendLocation(queue[0]);
      } catch (err) {
        if (isRetryable(err)) return;
        // permanently rejected: drop it and carry on with the rest
      }
      writeQueue(key, readQueue(key).slice(1));
    }
  } finally {
    flushing.delete(key);
  }
}
