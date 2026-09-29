import { useEffect, useRef } from "react";

/**
 * Laser barcode scanners plug in as a regular keyboard: they "type" the
 * scanned code character by character, very fast, then send an Enter (or
 * Tab) keystroke. There is nothing to click on these station screens — the
 * whole page just listens for this pattern globally and fires `onScan` with
 * the accumulated code once Enter is pressed.
 *
 * A couple of small safety nets so the odd human keystroke (or window focus
 * change) can't trigger a bogus scan:
 *  - the buffer resets if too much time passes between two keystrokes
 *    (scanners type in a few milliseconds per character, humans don't);
 *  - a scan only fires if the buffer has at least `minLength` characters;
 *  - typing is ignored while the buffer is empty and the key is a modifier
 *    or a pure navigation key.
 */
export function useScannerCapture(onScan: (code: string) => void, options?: { minLength?: number; resetMs?: number; enabled?: boolean }) {
  const minLength = options?.minLength ?? 3;
  const resetMs = options?.resetMs ?? 300;
  const enabled = options?.enabled ?? true;

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Never hijack typing inside a real input/textarea on the page.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > resetMs) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter" || e.key === "Tab") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        if (code.length >= minLength) {
          e.preventDefault();
          onScanRef.current(code);
        }
        return;
      }

      // Only accumulate printable, single characters (letters, digits, and
      // the punctuation commonly found in package/barcode ids).
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, minLength, resetMs]);
}
