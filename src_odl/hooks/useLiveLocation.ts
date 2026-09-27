import { useEffect, useRef, useState } from "react";

export interface LiveLocation {
  lat: number;
  lon: number;
  accuracy?: number;
}

interface UseLiveLocationResult {
  /** The device's current position, or null while loading / unavailable. */
  location: LiveLocation | null;
  /** Human-readable error message (in French, matching the rest of the app), if any. */
  error: string | null;
  /** True until the first position (or error) has been resolved. */
  loading: boolean;
}

/**
 * Tracks the CURRENT DEVICE's live position using the browser's Geolocation
 * API (navigator.geolocation).
 *
 * This is what must be used for the DRIVER's position anywhere in the
 * driver-facing app (Dashboard, DeliveryDetails, DeliveryCard, ...): the
 * driver is the person holding the phone/browser that is running this app,
 * so their real position can only come from navigator.geolocation.
 *
 * It must NOT come from `delivery.driverLatitude` / `delivery.driverLongitude`
 * — those are static placeholder coordinates stored on the delivery record
 * (set once, e.g. at creation time) and never move with the driver, which is
 * why the driver marker used to appear in the wrong place.
 *
 * By default this keeps watching (`watchPosition`) so the position updates
 * live as the driver moves. Pass `watch={false}` for a one-shot read.
 */
export function useLiveLocation(watch = true): UseLiveLocationResult {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("La géolocalisation n'est pas supportée par ce navigateur.");
      setLoading(false);
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      setLocation({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setError(null);
      setLoading(false);
    };

    const handleError = (err: GeolocationPositionError) => {
      setError(
        err.code === err.PERMISSION_DENIED
          ? "Position refusée. Autorisez la géolocalisation pour afficher votre position sur la carte."
          : "Impossible d'obtenir votre position actuelle."
      );
      setLoading(false);
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    if (watch) {
      try {
        watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
      } catch {
        setError("Impossible d'accéder à la géolocalisation dans ce contexte (HTTPS requis).");
        setLoading(false);
      }
    } else {
      try {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
      } catch {
        setError("Impossible d'accéder à la géolocalisation dans ce contexte (HTTPS requis).");
        setLoading(false);
      }
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [watch]);

  return { location, error, loading };
}
