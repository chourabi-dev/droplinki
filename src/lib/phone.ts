/**
 * Phone helpers for the driver app. Numbers come from companies / shippers in
 * many shapes ("20 123 456", "+216 20123456", "0021620123456"...), so every
 * dial / WhatsApp link goes through normalizePhone() first.
 */

const DEFAULT_COUNTRY_CODE = "216"; // Tunisia

/** Returns digits with country code and no "+" (e.g. "21620123456"), or "" when unusable. */
export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/\D/g, "");
  if (!digits) return "";
  // Local Tunisian number: 8 digits, no country code.
  if (digits.length === 8) return DEFAULT_COUNTRY_CODE + digits;
  // 0XXXXXXXX style
  if (digits.length === 9 && digits.startsWith("0")) return DEFAULT_COUNTRY_CODE + digits.slice(1);
  return digits;
}

export function isDialable(raw?: string | null): boolean {
  const n = normalizePhone(raw);
  return n.length >= 8 && n.length <= 15;
}

export function telUrl(raw: string): string {
  return `tel:+${normalizePhone(raw)}`;
}

/** wa.me wants digits only. */
export function waNumber(raw?: string | null): string {
  return normalizePhone(raw);
}

/** "21620123456" -> "+216 20 123 456" (Tunisian layout, generic fallback otherwise). */
export function formatPhone(raw?: string | null): string {
  const n = normalizePhone(raw);
  if (!n) return raw?.trim() || "—";
  if (n.startsWith("216") && n.length === 11) {
    const l = n.slice(3);
    return `+216 ${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5)}`;
  }
  return `+${n}`;
}

export interface DeliveryPhones {
  primary: string;
  /** Only present when a distinct, dialable secondary number exists. */
  secondary?: string;
}

/**
 * Primary number is always the one dialled first. The secondary number is
 * optional: it is dropped when empty, unusable, or identical to the primary.
 */
export function getPhones(d: { customerPhone?: string; customerEmmergencyPhone?: string }): DeliveryPhones {
  const primary = d.customerPhone?.trim() ?? "";
  const sec = d.customerEmmergencyPhone?.trim() ?? "";
  const secondary = sec && isDialable(sec) && normalizePhone(sec) !== normalizePhone(primary) ? sec : undefined;
  return { primary, secondary };
}
