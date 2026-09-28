import { useEffect, useRef, useState } from "react";
import { Search, LocateFixed, Loader2, X } from "lucide-react";
import { MapView } from "@/components/MapView";
import { cn } from "@/lib/utils";

export interface LatLon {
  lat: number;
  lon: number;
}

interface SearchResult {
  label: string;
  lat: number;
  lon: number;
}

/**
 * Address search box, backed by OpenStreetMap's public Nominatim geocoder
 * (same data source as the map tiles in MapView — no API key needed). Debounced
 * so it doesn't hammer the endpoint on every keystroke, and results are shown
 * as a dropdown the caller picks from.
 */
function AddressSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const thisRequest = ++requestId.current;
      try {
        // countrycodes=tn restricts results to Tunisia; viewbox+bounded=1 further
        // biases/limits to Tunisia's bounding box so cross-border ambiguous
        // place names (e.g. a town name shared with a neighboring country)
        // don't slip through.
        const TUNISIA_VIEWBOX = "7.49,37.54,11.60,30.14"; // lon_min,lat_max,lon_max,lat_min
        const url =
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5` +
          `&countrycodes=tn&viewbox=${TUNISIA_VIEWBOX}&bounded=1` +
          `&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
        if (thisRequest !== requestId.current) return; // a newer search superseded this one
        setResults(data.map((d) => ({ label: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) })));
        setOpen(true);
      } catch {
        if (thisRequest === requestId.current) setResults([]);
      } finally {
        if (thisRequest === requestId.current) setLoading(false);
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher une adresse, un quartier, un lieu..."
          className="w-full rounded-xl border border-ink-300 bg-white py-3 pl-10 pr-9 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-400" />
        ) : (
          query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-400 hover:bg-ink-100"
              aria-label="Effacer"
            >
              <X className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-[500] mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-ink-100 bg-white py-1.5 shadow-card">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(r);
                setQuery(r.label);
                setOpen(false);
              }}
              className="block w-full px-3.5 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface LocationPickerProps {
  value: LatLon | null;
  onChange: (value: LatLon) => void;
  className?: string;
  mapHeightClassName?: string;
}

/**
 * Full "pin your exact location" widget: an address search box (flies the map
 * to the match), a tap-to-place map marker (MapView's onPick), and a "use my
 * current position" shortcut backed by the browser's Geolocation API. Used by
 * the recipient-facing tracking page so the client can give the driver a
 * precise, driver-independent pin rather than a free-text address alone.
 */
export function LocationPicker({ value, onChange, className, mapHeightClassName = "h-72" }: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function useCurrentPosition() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Votre navigateur ne supporte pas la géolocalisation.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError("Position refusée ou indisponible. Recherchez votre adresse ou touchez la carte.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <AddressSearch onSelect={(r) => onChange({ lat: r.lat, lon: r.lon })} />

      <button
        type="button"
        onClick={useCurrentPosition}
        disabled={locating}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-600 bg-brand-50 px-4 py-3 text-[15px] font-semibold text-brand-700 transition-colors",
          "hover:bg-brand-100 active:scale-[0.98] disabled:opacity-60"
        )}
      >
        {locating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <LocateFixed className="h-5 w-5" />
        )}
        {locating ? "Localisation en cours..." : "Utiliser ma position actuelle"}
      </button>

      {geoError && <p className="text-xs text-warn-600">{geoError}</p>}

      <div className="flex items-center gap-3 text-xs text-ink-400">
        <div className="h-px flex-1 bg-ink-100" />
        ou placez le repère manuellement
        <div className="h-px flex-1 bg-ink-100" />
      </div>

      <div className={cn("overflow-hidden rounded-2xl border border-ink-100", mapHeightClassName)}>
        <MapView customer={value ?? undefined} zoom={value ? 16 : 12} onPick={(lat, lon) => onChange({ lat, lon })} />
      </div>

      <p className="text-xs text-ink-500">Touchez la carte pour ajuster précisément le repère.</p>
    </div>
  );
}
