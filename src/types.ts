export type DeliveryStatus ="EN-LIV" | "EN-DEP" | "EN-ATT" | "waiting_location" | "location_received" | "opened" | "delivered";

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string; // ISO
}

export interface Delivery {
  id: string; // e.g. DL-1042
  customerName: string;
  customerPhone: string;
  customerEmmergencyPhone: string; 
  reference?: string;
  amount?: number;
  notes?: string;
  status: DeliveryStatus;
  shareUrl: string; // relative path e.g. /d/DL-1042
  customerLatitude?: number;
  customerLongitude?: number;
  opened: boolean;
  driverLatitude?: number;
  driverLongitude?: number;
  createdAt: string; // ISO
  linkSentAt?: string;
  linkOpenedAt?: string;
  locationReceivedAt?: string;
  completedAt?: string;
  timeline: TimelineEvent[]; 
  delegation:string;
  delegationId:string;
  gouvernorate: string;
  gouvernorateId: string;
  address:string;     
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
  opened :"Lien ouvert",
  "EN-ATT": "en attente",
  "EN-DEP": "au dépôt",
  "EN-LIV": "en cours de livraison"
};

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  waiting_location: "bg-warn-50 text-warn-600 ring-warn-500/20",
  location_received: "bg-go-50 text-go-600 ring-go-500/20",
  delivered: "bg-ink-100 text-ink-700 ring-ink-300",
  opened: "bg-blue-100 text-blue-700 ring-blue-500/30",
  "EN-ATT": "bg-blue-100 text-blue-700 ring-blue-500/30",
  "EN-DEP": "bg-warn-50 text-warn-600 ring-warn-500/20",
  "EN-LIV": "bg-warn-50 text-warn-600 ring-warn-500/20",
  
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

// ---------------------------------------------------------------------------
// Geography — governorates & delegations (Tunisia). Seeded server-side and
// fetched read-only by the company dashboard; never created/edited from the
// frontend. A delivery zone always belongs to exactly one delegation, which
// itself belongs to exactly one governorate.
// ---------------------------------------------------------------------------

export interface Governorate {
  id: string;
  name: string;
  nameAr?: string;
}

export interface Delegation {
  id: string;
  name: string;
  nameAr?: string;
  governorateId: string;
}

/**
 * A company-defined delivery zone. A zone is a company-chosen grouping of
 * one or more delegations — possibly spread across several governorates
 * (e.g. "Zone A" = Carthage + La Marsa from Tunis; "Zone B" = Le Bardo +
 * Sijoumi from Tunis plus Hammam Lif + Boumhel from Ben Arous). Drivers are
 * then associated with one or more of these zones, never with a delegation
 * directly.
 */
export interface DeliveryZone {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  isActive: boolean;
  /** The one-to-many set of delegations that make up this zone. */
  delegationIds: string[];
  /** Optionally embedded by the API so the UI doesn't need a second round-trip. */
  delegations?: Delegation[];
  createdAt: string;
}

export type VehicleType = "moto" | "voiture" | "camionnette" | "velo" | "tricycle" | "camion";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  moto: "Moto",
  voiture: "Voiture",
  camionnette: "Camionnette",
  velo: "Vélo",
  tricycle: "Tricycle",
  camion: "Camion",
};

/** A driver that belongs to a company's roster (managed from the company dashboard). */
export interface CompanyDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Numéro de la carte d'identité nationale (CIN). Obligatoire. */
  cin: string;
  email?: string;
  address?: string;
  vehicleType: VehicleType;
  vehicleBrand?: string;
  vehicleModel?: string;
  plateNumber?: string;
  drivingLicenseNumber?: string;
  /** Zones de livraison couvertes par ce livreur. */
  deliveryZoneIds: string[];
  /** Optionally embedded by the API so the UI doesn't need a second round-trip. */
  deliveryZones?: DeliveryZone[];
  status: "active" | "invited" | "inactive";
  activeDeliveries?: number;
  completedDeliveries?: number;
  createdAt: string;
}

export function companyDriverFullName(d: Pick<CompanyDriver, "firstName" | "lastName">): string {
  return `${d.firstName} ${d.lastName}`.trim();
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

 
export interface ClientCompanyInfo {
  deliveryFees: number;
  availableGovernorates: Governorate[];
  availableDelegations: Delegation[];
}

/** A shipper (Expéditeur) account that belongs to a company's roster. */
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** CIN (Carte d'Identité Nationale) or Matricule Fiscale — identity/tax reference, required for pickups and invoicing. */
  taxId: string;
  governorateId: string;
  governorateName?: string;
  delegationId: string;
  delegationName?: string;
  /** Free-text address complement (street, building, floor...) within the delegation above. */
  address: string;
  status: "active" | "invited" | "inactive";
  activeDeliveries?: number;
  completedDeliveries?: number;
  createdAt: string;
  /** The company this client ships for, with its delivery fee and coverage area. */
  company?: ClientCompanyInfo;
}

export function clientFullName(c: Pick<Client, "firstName" | "lastName">): string {
  return `${c.firstName} ${c.lastName}`.trim();
}

/**
 * A delivery created by a client (Expéditeur) for one of their own
 * recipients. Shares the same status lifecycle as the other delivery
 * models. The recipient info is split into first/last name and two
 * optional phone numbers (a backup contact), plus a free-text address and
 * a short "help text" (indications to find the place — landmark, floor,
 * gate color...). Generating a validation link is optional: when enabled,
 * the backend returns a `shareUrl` pointing at the same public tracking
 * page used elsewhere in the app, which the client can send to the
 * recipient so they can confirm / share their exact position.
 */
export interface ClientDelivery {
  id: string; // e.g. EX-1042
  recipientFirstName: string;
  recipientLastName: string;
  recipientPhone1: string;
  recipientPhone2?: string;
  /** Governorate of the recipient's address — restricted to the shipping company's coverage area. */
  governorateId: string;
  governorateName?: string;
  /** Delegation of the recipient's address — restricted to the shipping company's coverage area. */
  delegationId: string;
  delegationName?: string;
  /** Free-text address complement (street, building, floor...) within the delegation above. */
  address: string;
  helpText?: string;
  designation: string;
  dimensions?: string;
  weight?: number;
  deliveryFees: number;
  /** Amount to collect from the recipient (cash on delivery). Does not include the delivery fees. */
  amount?: number;
  status: DeliveryStatus;
  /** Whether a validation link was requested for this delivery. */
  hasValidationLink: boolean;
  /** Relative path e.g. /d/EX-1042 — only present when hasValidationLink is true. */
  shareUrl?: string;
  customerLatitude?: number;
  customerLongitude?: number;
  createdAt: string;
  linkSentAt?: string;
  linkOpenedAt?: string;
  locationReceivedAt?: string;
  completedAt?: string;
  assignedDriverId? : string;
  callAttempts: CallAttempt[]
}

export function clientDeliveryRecipientFullName(d: Pick<ClientDelivery, "recipientFirstName" | "recipientLastName">): string {
  return `${d.recipientFirstName} ${d.recipientLastName}`.trim();
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

// ---------------------------------------------------------------------------
// Warehouse scan stations — unauthenticated, per-company screens
// ---------------------------------------------------------------------------
// Three "do nothing until a scan happens" screens, opened at the warehouse /
// loading dock on a device plugged to a laser barcode scanner (which behaves
// like a keyboard: it "types" the scanned code then sends Enter). Each
// screen is reachable at /company/:companyId/station/{depot|loading|returns}
// with no login — see src/hooks/useScannerCapture.ts and
// src/components/company/ScannerStation.tsx. A scan hits a public
// `/api/open/company/{companyId}/stations/...` endpoint (see
// companyStationsApi in lib/companyApi.ts) which updates the matching
// package/delivery status server-side.

export type StationKind = "depot" | "loading" | "returns";

/** What each station means for the scanned package, in French for the UI. */
export const STATION_LABELS: Record<StationKind, string> = {
  depot: "Colis en dépôt",
  loading: "Chargement du camion",
  returns: "Retours (colis abandonnés)",
};

export const STATION_DESCRIPTIONS: Record<StationKind, string> = {
  depot: "Scannez chaque colis à son arrivée au dépôt.",
  loading: "Scannez chaque colis au moment de son chargement dans le camion de livraison.",
  returns: "Scannez chaque colis abandonné / retourné par le client.",
};

/** Public info about a company, safe to show on an unauthenticated screen. */
export interface PublicCompanyInfo {
  id: string;
  name: string;
}

/** Result returned by the backend after a station scan updates a package. */
export interface StationScanResult {
  packageId: string;
  station: StationKind;
  /** Updated delivery status, when the backend maps this scan to one. */
  status?: DeliveryStatus;
  scannedAt: string; // ISO
}
