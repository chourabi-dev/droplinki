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
 * Splits a raw phone field that may contain several numbers glued together
 * ("20 123 456 / 98 765 432", "20123456,98765432", "20123456 et 98765432"...)
 * into individual numbers. Without this, normalizePhone() would strip the
 * separators and merge both numbers into a single, invalid one.
 */
export function splitPhones(raw?: string | null): string[] {
  if (!raw) return [];
  const parts = String(raw)
    .split(/[\/,;|\n\r\u060C]+|\s+(?:-|–|—|et|ou|and|or)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const digits = part.replace(/\D/g, "");
    // Two numbers written back to back without any separator.
    if (digits.length === 16) {
      out.push(digits.slice(0, 8), digits.slice(8));
    } else if (digits.length === 22 && digits.startsWith("216") && digits.slice(11, 14) === "216") {
      out.push(digits.slice(0, 11), digits.slice(11));
    } else if (digits.length === 24 && digits.startsWith("00216") && digits.slice(12, 17) === "00216") {
      out.push(digits.slice(0, 12), digits.slice(12));
    } else {
      out.push(part);
    }
  }
  return out;
}

type PhoneSource = {
  customerPhone?: string;
  customerEmmergencyPhone?: string;
  customerPhone2?: string;
  recipientPhone1?: string;
  recipientPhone2?: string;
};

/**
 * Primary number is always the one dialled first. The secondary number is
 * optional: it is dropped when empty, unusable, or identical to the primary.
 * The two numbers are always kept separate (never merged into one).
 */
export function getPhones(d: PhoneSource): DeliveryPhones {
  const candidates = [
    ...splitPhones(d.customerPhone ?? d.recipientPhone1),
    ...splitPhones(d.customerEmmergencyPhone ?? d.customerPhone2 ?? d.recipientPhone2),
  ];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of candidates) {
    const n = normalizePhone(c);
    if (!isDialable(c) || seen.has(n)) continue;
    seen.add(n);
    unique.push(c.trim());
  }
  // Keep an unusable-but-present primary so the UI can still display it.
  const primary = unique[0] ?? (splitPhones(d.customerPhone ?? d.recipientPhone1)[0] ?? "").trim();
  return { primary, secondary: unique.length > 1 ? unique[1] : undefined };
}
