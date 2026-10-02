export type DeliveryStatus ="CANCELED" | "EN-DEP-FAILD" | "EN-LIV" | "EN-DEP" | "EN-ATT" | "waiting_location" | "location_received" | "opened" | "delivered" | "delivered-payed";

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string; // ISO
}

export interface Delivery {
  id: string; // e.g. DL-1042
  customerName: string;
  customerPhone: string;
  /** Optional secondary phone number (kept with the backend's spelling). Empty / missing = none. */
  customerEmmergencyPhone?: string;
  /** Alternate field names the backend may use for the two numbers. */
  customerPhone2?: string;
  recipientPhone1?: string;
  recipientPhone2?: string;
  customerCheckURL:string;
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
  designation: string; 
  scheduledFor?: string;
  rescheduleReason?: string;
  rescheduleCount?: number; 
  callAttempts?: CallAttempt[];
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
  opened: "Lien ouvert", 
  "EN-ATT": "En attente",
  "EN-DEP": "En dépôt",
  "EN-LIV": "En cours de livraison",
  "EN-DEP-FAILD": "En dépôt, échec de livraison",
  "CANCELED": "Annulée",
  "delivered-payed": "livré et payé"
};

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  waiting_location: "bg-warn-50 text-warn-600 ring-warn-500/20",
  location_received: "bg-go-50 text-go-600 ring-go-500/20",
  delivered: "bg-warn-50 text-warn-600 ring-warn-500/20",
  "delivered-payed": "bg-warn-50 text-warn-600 ring-warn-500/20",


  opened: "bg-blue-100 text-blue-700 ring-blue-500/30", 
  "EN-ATT": "bg-blue-100 text-blue-700 ring-blue-500/30",
  "EN-DEP": "bg-warn-50 text-warn-600 ring-warn-500/20",
  "EN-LIV": "bg-ink-100 text-ink-700 ring-ink-300",
  "EN-DEP-FAILD": "bg-red-50 text-red-600 ring-red-500/20", 
  "CANCELED": "bg-gray-100 text-gray-600 ring-gray-500/20",
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
  /**
   * Frais de retour (DT) déduits du versement d'un client pour chaque colis
   * annulé définitivement. Fourni par le backend dans les infos entreprise.
   */
  returnFees?: number;
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

export type CallOutcome =
  | "no_answer"
  | "answered_no_location"
  | "location_confirmed"
  | "wrong_number"
  | "reschedule_requested"
  | "answered_canceled"

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "Pas de réponse",
  answered_no_location: "Répondu, position à confirmer",
  location_confirmed: "Position confirmée",
  wrong_number: "Numéro erroné",
  reschedule_requested: "Client demande un report",
  answered_canceled: "Annulée",
  
};

export interface CallAttempt {
  id: string;
  timestamp: string; // ISO
  outcome: CallOutcome;
  /** Which number was dialled. Missing on legacy company-side entries. */
  phoneUsed?: "primary" | "secondary";
  note?: string;
  latitude?: number;
  longitude?: number;
}

export type CompanyDeliverySource = "manual" | "csv_import";

/**
 * COMPATIBILITY SHIM — not part of the driver rebuild.
 * The company screens import `CompanyDelivery`, but it had been deleted from
 * this file on `main` (which broke `tsc -b`). Those screens use BOTH the new
 * ClientDelivery fields (recipientPhone1, callAttempts...) and the legacy
 * `customerName` / `customerPhone`, so it is modelled as the union of the two.
 * Clean this up when the company side is migrated to a single delivery model.
 */
export type CompanyDelivery = ClientDelivery & { customerName: string; customerPhone: string };

 
export interface ClientCompanyInfo {
  deliveryFees: number;
  returnFees?: number;
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
  deliveryFees: number;
  returnFees: number;
  taxRemovalPercentage:number;
 
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
  callAttempts: CallAttempt[];
  /** ISO — date de la prochaine tentative de livraison (après un échec / report). */
  scheduledFor?: string;
  /** Motif du dernier report / de l'échec de livraison. */
  rescheduleReason?: string;
  /** Nombre de fois où la livraison a été reportée / relancée. */
  rescheduleCount?: number;
  /** ISO — date à laquelle ce colis a été traité dans un versement client. Présent = déjà réglé. */
  paidAt?: string;
  /** Identifiant du versement client qui a traité ce colis. */
  payoutId?: string;
  /** Identifiant de la clôture livreur (remise des espèces) qui a traité ce colis. */
  settlementId?: string;
  /**
   * Journal du colis : liste chronologique des actions effectuées dessus
   * (scans en station, décisions, relances...). Alimenté côté serveur ; affiché
   * à l'employé à côté des autres informations. Peut être absent sur d'anciens
   * enregistrements — toujours lire avec `?? []`.
   */
  journal: JournalEntry[];
}

/** One action recorded in a package's journal (see ClientDelivery.journal). */
export interface JournalEntry {
  id: string;
  /** Human-readable description of the action, e.g. "Colis scanné au chargement du camion". */
  text: string;
  createdAt: string; // ISO
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

// ---------------------------------------------------------------------------
// "Contrôle des retours" station (return check)
// ---------------------------------------------------------------------------
// A fourth, different kind of station: it doesn't just stamp a status. The
// employee scans a package, the screen loads the package's full history
// (journal, call attempts, reschedules...) and the employee then decides:
//   - "return": the package is canceled for good and goes back to the sender
//               (status → CANCELED, return fees apply at the client's payout);
//   - "resend": the package goes back out for a new delivery attempt.
// Reachable at /company/:companyId/station/return-check, no login. It is
// deliberately NOT part of `StationKind` (which only covers the
// stamp-a-status stations handled by `companyStationsApi.scan`).

export const RETURN_CHECK_LABEL = "Contrôle des retours";
export const RETURN_CHECK_DESCRIPTION =
  "Scannez un colis pour afficher son historique, puis décidez : le retourner à l'expéditeur ou le renvoyer en livraison.";

export type ReturnCheckDecision = "return" | "resend";

export const RETURN_CHECK_DECISION_LABELS: Record<ReturnCheckDecision, string> = {
  return: "Retourner à l'expéditeur",
  resend: "Renvoyer en livraison",
};


// ---------------------------------------------------------------------------
// Client payouts (versements aux expéditeurs)
// ---------------------------------------------------------------------------
// The company pays each client for the packages that were delivered (the
// cash collected, without delivery fees). Canceled / returned packages are
// NOT part of a payout anymore: they are handled separately in the
// "Retours clients" flow (see "Client returns" below). Each package can be
// settled only once: validating a payout stamps its packages server-side
// (`paidAt` / `payoutId` on the delivery) so they never show up again.

export type PayoutLineKind = "delivered" | "returned";

export interface PayoutLine {
  deliveryId: string;
  recipientName: string;
  /** The backend now only returns "delivered" lines; "returned" is legacy and ignored by the UI. */
  kind: PayoutLineKind;
  status: DeliveryStatus;
  /** Cash collected for this package (DT). */
  amount: number;
  /** Delivered date, ISO. */
  date?: string;
}

/** Unsettled delivered packages of one client, as returned by the backend before validation. */
export interface ClientPayoutPreview {
  client: Pick<Client, "id" | "firstName" | "lastName" | "phone" | "email">;
  /** @deprecated Return fees are no longer part of a payout (see ClientReturnPreview). */
  returnFee?: number;
  lines: PayoutLine[];
}

/** A validated payout (receipt). */
export interface ClientPayout {
  id: string;
  clientId: string;
  createdAt: string;
  deliveredCount: number;
  /** @deprecated Legacy field — canceled packages are no longer part of a payout. */
  returnedCount?: number;
  grossAmount: number;
  /** @deprecated Legacy field — canceled packages are no longer part of a payout. */
  returnFeesTotal?: number;
  netAmount: number;
  deliveryIds: string[];
}

// ---------------------------------------------------------------------------
// Client returns (retours clients)
// ---------------------------------------------------------------------------
// Canceled packages (status CANCELED) are physically handed back to their
// sender (the client / Expéditeur). The company prints a return slip (PDF
// generated by the backend) listing the packages and the return fees due,
// the client signs it and pays the fees, then the company confirms the
// handover. Confirming stamps the packages server-side so they can't be
// handed back — or billed — twice.

/** One canceled package waiting to be handed back to its client. */
export interface ClientReturnLine {
  deliveryId: string;
  recipientName: string;
  /** What is inside the package (delivery designation). */
  designation?: string;
  status: DeliveryStatus;
  /** Cancellation date, ISO. */
  canceledAt?: string;
  /** Why the delivery was canceled, when known. */
  reason?: string;
}

/** Canceled packages of one client that haven't been handed back yet. */
export interface ClientReturnPreview {
  client: Pick<Client, "id" | "firstName" | "lastName" | "phone" | "email">;
  /** Frais de retour appliqués par colis (DT), copied from the company info. */
  returnFee: number;
  lines: ClientReturnLine[];
}

/** A confirmed handover (signed return slip). */
export interface ClientReturn {
  id: string;
  clientId: string;
  createdAt: string;
  returnedCount: number;
  /** Return fee applied per package (DT). */
  returnFee: number;
  /** returnedCount × returnFee — what the client paid on handover (DT). */
  feesTotal: number;
  deliveryIds: string[];
}

// ---------------------------------------------------------------------------
// Driver settlements (clôture de tournée / remise des espèces)
// ---------------------------------------------------------------------------
// At the end of a round the driver comes back to the depot with the cash
// collected on the successful deliveries and the packages that could not be
// delivered. The company picks the driver, marks every package as delivered
// or returned, and validates: the backend then switches the statuses for good
// (delivered → "delivered", returned → "EN-DEP-FAILD", i.e. back at the depot)
// and stamps the packages (`settlementId`) so they can't be closed twice.
// Once "delivered", a package becomes payable to its client (see payouts).

export type SettlementOutcome = "delivered" | "returned";

export interface DriverSettlementLine {
  deliveryId: string;
  recipientName: string;
  /** Current status of the package (EN-LIV = still on the truck). */
  status: DeliveryStatus;
  /** Cash-on-delivery amount owed by the recipient (DT), delivery fees excluded. */
  amount: number;
  /** Delivery fees (DT) collected on top of `amount`. */
  deliveryFees: number;
}

/** Packages a driver still has to close, as returned by the backend before validation. */
export interface DriverSettlementPreview {
  driver: Pick<CompanyDriver, "id" | "firstName" | "lastName" | "phone">;
  lines: DriverSettlementLine[];
}

/** A validated settlement (receipt). */
export interface DriverSettlement {
  id: string;
  driverId: string;
  createdAt: string;
  deliveredCount: number;
  returnedCount: number;
  /** Sum of `amount` on delivered packages. */
  amountTotal: number;
  /** Sum of `deliveryFees` on delivered packages. */
  feesTotal: number;
  /** amountTotal + feesTotal = cash handed over by the driver. */
  cashTotal: number;
  deliveredIds: string[];
  returnedIds: string[];
}

/** Pagination metadata returned by paginated list endpoints. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
