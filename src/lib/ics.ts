import { downloadBlob } from "@/lib/utils";

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * Calendar event with an alarm. Unlike in-app reminders it still rings when
 * the browser / app is closed, which matters for rescheduled pickups.
 */
export function downloadRescheduleIcs(opts: {
  deliveryId: string;
  customerName: string;
  when: Date;
  address?: string;
  phone?: string;
  remindBeforeMin: number;
}) {
  const end = new Date(opts.when.getTime() + 15 * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DropLink//Driver//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.deliveryId}-${opts.when.getTime()}@droplink`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(opts.when)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(`Livraison reportée — ${opts.customerName}`)}`,
    `DESCRIPTION:${esc(`Livraison ${opts.deliveryId}${opts.phone ? `\nTél : ${opts.phone}` : ""}`)}`,
    ...(opts.address ? [`LOCATION:${esc(opts.address)}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Livraison ${opts.customerName}`)}`,
    `TRIGGER:-PT${Math.max(0, opts.remindBeforeMin)}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  downloadBlob(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }), `livraison-${opts.deliveryId}.ics`);
}
