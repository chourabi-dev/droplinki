export type DeliveryStatus = "waiting_location" | "location_received" | "opened" | "delivered";

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string; // ISO
}

export interface Delivery {
  id: string; // e.g. DL-1042
  customerName: string;
  customerPhone: string;
  reference?: string;
  amount?: number;
  notes?: string;
  status: DeliveryStatus;
  shareUrl: string; // relative path e.g. /d/DL-1042
  customerLatitude?: number;
  customerLongitude?: number;
  /**
   * Static placeholder coordinates from the backend record. Kept for API
   * compatibility only — the UI must NOT use these to show the driver's
   * position. The driver's real position comes live from the browser's
   * Geolocation API (see src/hooks/useLiveLocation.ts), since the driver is
   * whoever is holding the device the app is running on.
   */
  driverLatitude: number;
  driverLongitude: number;
  createdAt: string; // ISO
  linkSentAt?: string;
  linkOpenedAt?: string;
  locationReceivedAt?: string;
  completedAt?: string;
  timeline: TimelineEvent[];
}

export interface Driver {
  id?: string;
  name: string;
  phone?: string;
  email: string;
  plan: "free" | "pro";
  emailVerified: boolean 
}

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  waiting_location: "En attente de position",
  location_received: "Position reçue",
  delivered: "Livrée",
  opened :"Lien ouvert"
};

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  waiting_location: "bg-warn-50 text-warn-600 ring-warn-500/20",
  location_received: "bg-go-50 text-go-600 ring-go-500/20",
  delivered: "bg-ink-100 text-ink-700 ring-ink-300",
  opened: "bg-blue-100 text-blue-700 ring-blue-500/30",
};

// ---------------------------------------------------------------------------
// Company / Pro space
// ---------------------------------------------------------------------------
// Everything below powers the separate company dashboard (see src/pages/company,
// src/context/Company*Context.tsx, src/lib/companyApi.ts). It is additive to
// the driver data model above and does not change it.

export interface Company {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  /** Matricule fiscale (numéro d'identification fiscale de l'entreprise). Obligatoire. */
  taxId: string;
  /** Adresse du siège social. Obligatoire. */
  headOfficeAddress: string;
  plan: "pro";
  emailVerified: boolean;
}

/** A driver that belongs to a company's roster (managed from the company dashboard). */
export interface CompanyDriver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType?: string;
  status: "active" | "invited" | "inactive";
  activeDeliveries?: number;
  completedDeliveries?: number;
  createdAt: string;
}

export type CallOutcome = "no_answer" | "answered_no_location" | "location_confirmed" | "wrong_number";

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "Pas de réponse",
  answered_no_location: "Répondu, position à confirmer",
  location_confirmed: "Position confirmée",
  wrong_number: "Numéro erroné",
};

export interface CallAttempt {
  id: string;
  timestamp: string; // ISO
  outcome: CallOutcome;
  note?: string;
  latitude?: number;
  longitude?: number;
}

export type CompanyDeliverySource = "manual" | "csv_import";

/**
 * A delivery owned by a company. Shares the same status lifecycle as the
 * driver-side Delivery, plus company-only fields: which internal driver it
 * is assigned to, how it was created, and the phone-call log used to
 * pin down the customer's location manually when they can't use the
 * self-service tracking link.
 */
export interface CompanyDelivery {
  id: string; // e.g. CD-1042
  customerName: string;
  customerPhone: string;
  reference?: string;
  amount?: number;
  notes?: string;
  address?: string;
  status: DeliveryStatus;
  shareUrl: string; // relative path e.g. /d/CD-1042 — same public tracking page as driver deliveries
  customerLatitude?: number;
  customerLongitude?: number;
  assignedDriverId?: string;
  source: CompanyDeliverySource;
  callAttempts: CallAttempt[];
  createdAt: string;
  completedAt?: string;
}

export interface CsvImportRow {
  customerName: string;
  customerPhone: string;
  reference?: string;
  amount?: number;
  notes?: string;
  address?: string;
}

export interface CompanyStatsDailyPoint {
  date: string; // ISO day
  created: number;
  delivered: number;
}

export interface CompanyDriverStat {
  driverId: string;
  driverName: string;
  assigned: number;
  delivered: number;
}

export interface CompanyStats {
  totalDeliveries: number;
  delivered: number;
  pending: number;
  locationConfirmed: number;
  avgTimeToLocationMinutes?: number;
  daily: CompanyStatsDailyPoint[];
  byDriver: CompanyDriverStat[];
}
