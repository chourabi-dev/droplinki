import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Haversine distance in km
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateMinutes(km: number): number {
  // assume avg city delivery speed of ~24 km/h
  return Math.max(1, Math.round((km / 24) * 60));
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " · " + formatTime(iso);
}

export function formatAmount(amount?: number): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "—";
  return `${amount.toFixed(amount % 1 === 0 ? 0 : 2)} DT`;
}

export function jitterCoord(lat: number, lon: number, spreadKm = 1.2): { lat: number; lon: number } {
  // roughly convert km to degrees
  const dLat = (Math.random() - 0.5) * (spreadKm / 111);
  const dLon = (Math.random() - 0.5) * (spreadKm / 88);
  return { lat: lat + dLat, lon: lon + dLon };
}

export function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

export function whatsappUrl(phoneOrBlank: string, message: string): string {
  const base = phoneOrBlank ? `https://wa.me/${phoneOrBlank}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(message)}`;
}
