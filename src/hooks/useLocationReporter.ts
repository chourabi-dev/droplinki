import { useEffect, useRef } from "react";
import { flushLocations, getPosition, reportLocation, toLocationInput } from "@/lib/driverLocation";

/** While the app stays open and visible, report at this rhythm. */
const REPORT_EVERY_MS = 60_000;
/** Open + focus + visibility events often fire together: collapse them into one send. */
const MIN_GAP_MS = 10_000;

interface Options {
  /** Queue namespace; one per driver so accounts never mix on a shared device. */
  driverKey: string;
  /** The OS/browser revoked location access mid-session. */
  onPermissionDenied: () => void;
}

/**
 * Sends the driver's position to the API:
 *  - as soon as the app is opened,
 *  - every time the driver comes back to it (tab/app becomes visible again),
 *  - then every minute while it stays open.
 * Failed sends are queued and retried (see lib/driverLocation.ts).
 *
 * Only mount this once location access is confirmed (see LocationGate).
 */
export function useLocationReporter({ driverKey, onPermissionDenied }: Options) {
  const lastSentAt = useRef(0);
  const reading = useRef(false);
  const onDenied = useRef(onPermissionDenied);
  onDenied.current = onPermissionDenied;

  useEffect(() => {
    let cancelled = false;

    async function report(force = false) {
      if (document.visibilityState !== "visible") return;
      if (reading.current) return;
      if (!force && Date.now() - lastSentAt.current < MIN_GAP_MS) return;

      reading.current = true;
      try {
        const pos = await getPosition({ highAccuracy: true, maxAgeMs: 5000, timeoutMs: 15000 });
        if (cancelled) return;
        lastSentAt.current = Date.now();
        await reportLocation(driverKey, toLocationInput(pos));
      } catch (err: any) {
        // Permission revoked → block the app. Anything else (tunnel, weak GPS)
        // is transient: skip this tick and try again at the next one.
        if (!cancelled && err?.code === 1) onDenied.current();
      } finally {
        reading.current = false;
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") report();
    };
    const onFocus = () => report();
    const onOnline = () => flushLocations(driverKey);

    report(true); // app opened
    const timer = window.setInterval(() => report(), REPORT_EVERY_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [driverKey]);
}
