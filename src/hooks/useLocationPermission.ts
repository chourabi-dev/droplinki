import { useCallback, useEffect, useRef, useState } from "react";
import { getPosition } from "@/lib/driverLocation";

/**
 * - checking:    verifying (or waiting for the browser prompt to be answered)
 * - prompt:      permission not asked yet — show the explainer, ask on tap
 * - granted:     permission granted AND a real position was obtained
 * - denied:      the driver (or the browser) refused location access
 * - unavailable: this browser / context can't do geolocation at all (no API, or not HTTPS)
 * - error:       permission is fine but no position could be read (GPS off, no signal, timeout)
 */
export type LocationAccess = "checking" | "prompt" | "granted" | "denied" | "unavailable" | "error";

type PermissionState3 = "granted" | "denied" | "prompt";

async function queryPermission(): Promise<PermissionStatus | null> {
  try {
    if (!navigator.permissions?.query) return null;
    return await navigator.permissions.query({ name: "geolocation" as PermissionName });
  } catch {
    return null; // some browsers (older Safari) throw for "geolocation"
  }
}

/**
 * Tells whether the driver is really sharing their location, and lets the UI
 * (re)ask for it. A driver only counts as "granted" once a position was
 * actually read — a granted permission with the device GPS switched off still
 * blocks, because nothing could be reported to the company.
 */
export function useLocationPermission() {
  const [access, setAccess] = useState<LocationAccess>("checking");
  const mounted = useRef(true);
  const busy = useRef(false);

  const set = useCallback((next: LocationAccess) => {
    if (mounted.current) setAccess(next);
  }, []);

  /** Reads a position; this is also what triggers the browser's permission prompt. */
  const verify = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    set("checking");
    try {
      await getPosition({ highAccuracy: false, maxAgeMs: 10000, timeoutMs: 15000 });
      set("granted");
    } catch (err: any) {
      if (err instanceof Error && err.message === "geolocation-unsupported") set("unavailable");
      else if (err?.code === 1) set("denied");
      else if (err?.code === 2 || err?.code === 3) set("error");
      else set("unavailable");
    } finally {
      busy.current = false;
    }
  }, [set]);

  /** For the reporter: a read failed with PERMISSION_DENIED while the app was in use. */
  const reportDenied = useCallback(() => set("denied"), [set]);

  useEffect(() => {
    mounted.current = true;
    let status: PermissionStatus | null = null;
    let onChange: (() => void) | null = null;

    (async () => {
      if (!("geolocation" in navigator) || !window.isSecureContext) {
        set("unavailable");
        return;
      }

      status = await queryPermission();
      if (!mounted.current) return;

      if (!status) {
        // No Permissions API: just try; the browser shows its own prompt if needed.
        verify();
        return;
      }

      const sync = () => {
        const state = status!.state as PermissionState3;
        if (state === "granted") verify();
        else if (state === "denied") set("denied");
        else set("prompt");
      };
      onChange = sync;
      status.addEventListener("change", sync);
      sync();
    })();

    return () => {
      mounted.current = false;
      if (status && onChange) status.removeEventListener("change", onChange);
    };
  }, [verify, set]);

  // Coming back to the app after fixing it in the browser/OS settings.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (access === "denied" || access === "error") verify();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [access, verify]);

  return { access, retry: verify, reportDenied };
}
