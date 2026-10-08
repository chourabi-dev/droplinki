import {
  Company,
  CompanyDelivery,
  CompanyDriver,
  DriverLocationPoint,
  CompanyStats,
  CallOutcome,
  CsvImportRow,
  Governorate,
  Delegation,
  DeliveryZone,
  VehicleType,
  Client,
  StationKind,
  StationScanResult,
  ReturnCheckDecision,
  ClientDelivery,
  PublicCompanyInfo,
  ClientPayoutPreview,
  ClientPayout,
  ClientReturnPreview,
  ClientReturn,
  DriverSettlementPreview,
  DriverSettlement,
  Paginated,
} from "@/types";
import { ApiError, isNetworkError } from "@/lib/api";

/**
 * Base URL of the Symfony backend — same host as the driver app
 * (VITE_API_BASE_URL), but every route below lives under its own
 * `/api/company/...` namespace so it can be implemented and deployed
 * independently from the driver API.
 *
 * NOTE: as of this integration the Symfony backend does not implement these
 * routes yet (same status as the driver API — see README.md → "Backend API
 * contract — Espace entreprise"). This client is written against that
 * documented contract; calls will fail with a network / 404 error until the
 * backend exposes them, and callers must handle that gracefully (surfaced
 * via toasts / inline error states, never a crash).
 */
//const API_BASE_URL = ("https://api.droplinki.com/").replace(/\/+$/, "");
const API_BASE_URL = ("http://localhost:8000/").replace(/\/+$/, "");

// Storage keys are namespaced separately from the driver app's "droplink:*"
// keys so a person can be logged in as a driver and as a company at the same
// time (e.g. two tabs), without either session clobbering the other.
const TOKEN_KEY = "droplink:company:token";
const USER_KEY = "droplink:company:user";

export function getCompanyToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCompanyToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export function getStoredCompany(): Company | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Company) : null;
  } catch {
    return null;
  }
}

export function setStoredCompany(company: Company | null) {
  try {
    if (company) localStorage.setItem(USER_KEY, JSON.stringify(company));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // ignore storage errors
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean; // attach Authorization header (default true)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  if (auth) {
    const token = getCompanyToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
    });
  } catch (err) {
    throw new ApiError(
      "Impossible de joindre le serveur.",
      0,
      err
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");
  const data = isJSON ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && String((data as any).message)) ||
      `Erreur serveur (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

/**
 * Like `request` above, but for endpoints that return a binary file (PDF)
 * instead of JSON — e.g. the client return slip. Same auth/error handling,
 * but resolves to a Blob. Supports POST so the PDF can be generated from a
 * JSON body (the list of packages shown on screen).
 */
async function requestBlob(path: string, options: { method?: string; body?: unknown } = {}): Promise<Blob> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = { Accept: "application/pdf" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getCompanyToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      "Impossible de joindre le serveur.",
      0,
      err
    );
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json().catch(() => undefined) : undefined;
    const message =
      (data && typeof data === "object" && "message" in data && String((data as any).message)) ||
      `Erreur serveur (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  const blob = await response.blob();
  // Make sure the browser's PDF viewer / print dialog recognises the file.
  return blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
}

export { ApiError, isNetworkError };

// ---------------------------------------------------------------------------
// Auth — /api/company/auth
// ---------------------------------------------------------------------------

export interface CompanyAuthResponse {
  token: string;
  company: Company;
}

export const companyAuthApi = {
  login: (username: string, password: string) =>
    request<CompanyAuthResponse>("/api/company/auth/login", { method: "POST", body: { username, password }, auth: false }),

  register: (input: { name: string; phone: string; email: string; password: string; taxId: string; headOfficeAddress: string }) =>
    request<CompanyAuthResponse>("/api/company/auth/register", { method: "POST", body: input, auth: false }),

  me: () => request<Company>("/api/company/me", { method: "GET" }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/company/auth/forgot-password", { method: "POST", body: { email }, auth: false }),

  verifyResetCode: (input: { email: string; code: string }) =>
    request<{ message: string }>("/api/company/auth/verify-reset-code", { method: "POST", body: input, auth: false }),

  resetPassword: (input: { email: string; code: string; password: string }) =>
    request<{ message: string }>("/api/company/auth/reset-password", { method: "POST", body: input, auth: false }),
};

// ---------------------------------------------------------------------------
// Geography — /api/company/geo (read-only, seeded server-side)
// ---------------------------------------------------------------------------
// Governorates and delegations are seeded in the database and never
// created/edited from the frontend. Delegations are always fetched scoped to
// a governorate, matching the cascading picker in the UI (governorate →
// delegation → delivery zone).

export const companyGeoApi = {
  governorates: () => request<Governorate[]>("/api/company/geo/governorates", { method: "GET" }),

  delegations: (governorateId: string) =>
    request<Delegation[]>(
      `/api/company/geo/governorates/${encodeURIComponent(governorateId)}/delegations`,
      { method: "GET" }
    ),
};

// ---------------------------------------------------------------------------
// Delivery zones — /api/company/delivery-zones
// ---------------------------------------------------------------------------
// Each zone belongs to a company and groups together one-to-many delegations
// (picked, one at a time, via the governorate → delegation cascade above;
// the same zone can mix delegations from several governorates).

export interface CreateDeliveryZoneInput {
  name: string;
  nameAr: string;
  description?: string;
  isActive: boolean;
  delegationIds: string[];
}

export const companyDeliveryZonesApi = {
  list: () => request<DeliveryZone[]>("/api/company/delivery-zones", { method: "GET" }),

  create: (input: CreateDeliveryZoneInput) =>
    request<DeliveryZone>("/api/company/delivery-zones", { method: "POST", body: input }),

  update: (id: string, input: Partial<CreateDeliveryZoneInput>) =>
    request<DeliveryZone>(`/api/company/delivery-zones/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (id: string) =>
    request<void>(`/api/company/delivery-zones/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Drivers roster — /api/company/drivers
// ---------------------------------------------------------------------------

export interface CreateCompanyDriverInput {
  firstName: string;
  lastName: string;
  phone: string;
  cin: string;
  email?: string;
  password?: string;
  address?: string;
  vehicleType: VehicleType;
  vehicleBrand?: string;
  vehicleModel?: string;
  plateNumber?: string;
  drivingLicenseNumber?: string;
  deliveryZoneIds?: string[];
  /**
   * When true (requires `email` + `password` to be set), the backend sends
   * the driver their account credentials by email after creation.
   */
  sendCredentialsEmail?: boolean;
}

/** 0 = today, 1 = yesterday, 7 = last 7 days. */
export type DriverMovementsRange = 0 | 1 | 7;

export const companyDriversApi = {
  list: () => request<CompanyDriver[]>("/api/company/drivers", { method: "GET" }),

  create: (input: CreateCompanyDriverInput) =>
    request<CompanyDriver>("/api/company/drivers", { method: "POST", body: input }),

  update: (id: string, input: Partial<CreateCompanyDriverInput> & { status?: CompanyDriver["status"] }) =>
    request<CompanyDriver>(`/api/company/drivers/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),

  remove: (id: string) =>
    request<void>(`/api/company/drivers/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /**
   * GPS points recorded for a driver over a period, oldest first. Powers the
   * "Mouvements" map (see src/pages/company/CompanyDriverMovements.tsx and
   * src/DRIVER_MOVEMENTS_API.md for the contract).
   *
   * `range` is a day count, not a date: 0 = today, 1 = yesterday,
   * 7 = the last 7 days. The server works out the actual dates.
   */
  locations: async (id: string, range: DriverMovementsRange = 0): Promise<DriverLocationPoint[]> => {
    const raw = await request<unknown>(
      `/api/company/drivers/${encodeURIComponent(id)}/locations?range=${range}`,
      { method: "GET" }
    );
    return normalizeDriverLocations(raw);
  },
};

/**
 * Accepts either a bare array or an `{ items | points | data }` envelope, and
 * both `latitude/longitude` and `lat/lng/lon` field names, so the UI keeps
 * working whichever shape the backend settles on. Invalid rows are dropped and
 * the result is sorted oldest → newest.
 */
function normalizeDriverLocations(raw: unknown): DriverLocationPoint[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? ((raw as any).items ?? (raw as any).points ?? (raw as any).data ?? [])
      : [];

  const points: DriverLocationPoint[] = [];
  for (const row of list as any[]) {
    if (!row || typeof row !== "object") continue;
    const latitude = Number(row.latitude ?? row.lat);
    const longitude = Number(row.longitude ?? row.lng ?? row.lon);
    const recordedAt = String(row.recordedAt ?? row.createdAt ?? row.timestamp ?? "");
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    if (!recordedAt || Number.isNaN(new Date(recordedAt).getTime())) continue;
    const speed = row.speedKmh ?? row.speed;
    const accuracy = row.accuracy;
    points.push({
      latitude,
      longitude,
      recordedAt,
      speedKmh: speed != null && Number.isFinite(Number(speed)) ? Number(speed) : undefined,
      accuracy: accuracy != null && Number.isFinite(Number(accuracy)) ? Number(accuracy) : undefined,
    });
  }
  return points.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

// ---------------------------------------------------------------------------
// Clients roster (Expéditeurs) — /api/company/clients
// ---------------------------------------------------------------------------
// A "client" here is a shipper account created by the company. The client
// then logs into their own space (src/pages/client, src/context/Client*
// Context.tsx) to create deliveries for their own recipients. This mirrors
// the drivers roster above but the account belongs to a shipper, not a
// driver.

export interface CreateCompanyClientInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** CIN or Matricule Fiscale — required, used for pickups & invoicing. */
  taxId: string;
  governorateId: string;
  delegationId: string;
  /** Free-text address complement (street, building, floor...) — used later for pickups. */
  address: string;
}

export const companyClientsApi = {
  list: () => request<Client[]>("/api/company/clients", { method: "GET" }),

  create: (input: CreateCompanyClientInput) =>
    request<Client>("/api/company/clients", { method: "POST", body: input }),

  update: (id: string, input: Partial<CreateCompanyClientInput> & { status?: Client["status"] }) =>
    request<Client>(`/api/company/clients/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),

  remove: (id: string) =>
    request<void>(`/api/company/clients/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Deliveries — /api/company/deliveries
// ---------------------------------------------------------------------------

export interface CreateCompanyDeliveryInput {
  customerName: string;
  customerPhone: string;
  reference?: string;
  amount?: number;
  notes?: string;
  address?: string;
  assignedDriverId?: string;
}

export interface ImportCsvResult {
  created: CompanyDelivery[];
  errors: { row: number; message: string }[];
}

export interface ListDeliveriesParams {
  page?: number;
  limit?: number;
  /** Free-text search: recipient name, phone or delivery id. */
  q?: string;
  /** "all" | "unassigned" | a DeliveryStatus value. */
  filter?: string;
}

export interface LogCallInput {
  outcome: CallOutcome;
  note?: string;
  latitude?: number;
  longitude?: number;
}

export const companyDeliveriesApi = {
  /**
   * Full, unpaginated list (no `page` param → legacy backend behaviour).
   * Only used by screens that aggregate over every delivery (dashboard,
   * drivers). Prefer `listPage` for anything that renders a list.
   */
  list: () => request<CompanyDelivery[]>("/api/company/deliveries", { method: "GET" }),

  /** Server-side paginated + filtered list. */
  listPage: (params: ListDeliveriesParams = {}, signal?: AbortSignal) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("limit", String(params.limit ?? 20));
    if (params.q?.trim()) qs.set("q", params.q.trim());
    if (params.filter && params.filter !== "all") qs.set("filter", params.filter);
    return request<Paginated<CompanyDelivery>>(`/api/company/deliveries?${qs.toString()}`, { method: "GET", signal });
  },

  get: (id: string) => request<CompanyDelivery>(`/api/company/deliveries/${encodeURIComponent(id)}`, { method: "GET" }),

  create: (input: CreateCompanyDeliveryInput) =>
    request<CompanyDelivery>("/api/company/deliveries", { method: "POST", body: input }),

  /** Bulk-create deliveries parsed client-side from an uploaded CSV file. */
  importCsv: (rows: CsvImportRow[]) =>
    request<ImportCsvResult>("/api/company/deliveries/import", { method: "POST", body: { rows } }),

  assignDriver: (id: string, driverId: string | null) =>
    request<CompanyDelivery>(`/api/company/deliveries/${encodeURIComponent(id)}/assign`, {
      method: "PATCH",
      body: { driverId },
    }),

  /** Logs a phone-call attempt made by company staff to reach the customer for their location. */
  logCall: (id: string, input: LogCallInput) =>
    request<CompanyDelivery>(`/api/company/deliveries/${encodeURIComponent(id)}/call`, {
      method: "POST",
      body: input,
    }),

  markDelivered: (id: string) =>
    request<CompanyDelivery>(`/api/company/deliveries/${encodeURIComponent(id)}/delivered`, { method: "PATCH" }),

  /**
   * Company staff decision on a package whose delivery failed (EN-DEP-FAILD):
   * launch a new delivery attempt. Increments `rescheduleCount` server-side.
   */
  relaunch: (id: string, input: RelaunchDeliveryInput) =>
    request<CompanyDelivery>(`/api/company/deliveries/${encodeURIComponent(id)}/relaunch`, {
      method: "PATCH",
      body: input,
    }),

  /** Company staff decision on a failed package: cancel for good (return fees will apply at payout). */
  cancel: (id: string, input: { reason?: string } = {}) =>
    request<CompanyDelivery>(`/api/company/deliveries/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
      body: input,
    }),
};

export interface RelaunchDeliveryInput {
  /** ISO date/time of the new attempt. Optional: omitted = "as soon as possible". */
  scheduledFor?: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Client payouts — /api/company/payouts
// ---------------------------------------------------------------------------
// Pay a client (Expéditeur) for their delivered packages. The backend only
// returns delivered packages here: canceled ones are handled by the
// "Retours clients" flow (companyReturnsApi below). Packages already covered
// by a validated payout are never returned by `preview`, and `validate`
// rejects (409) any package that was settled in the meantime, so a client
// can never be paid twice.

export const companyPayoutsApi = {
  /** Unsettled delivered packages of a client. */
  preview: (clientId: string) =>
    request<ClientPayoutPreview>(`/api/company/payouts/preview?clientId=${encodeURIComponent(clientId)}`, {
      method: "GET",
    }),

  /** Validates the payout and marks exactly these packages as settled. */
  validate: (clientId: string, deliveryIds: string[]) =>
    request<ClientPayout>("/api/company/payouts", { method: "POST", body: { clientId, deliveryIds } }),

  /** Past validated payouts, newest first. */
  history: (clientId: string) =>
    request<ClientPayout[]>(`/api/company/payouts?clientId=${encodeURIComponent(clientId)}`, { method: "GET" }),

  /** Generates the payout statement (PDF) for these packages, before validation. Does not change any data. */
  downloadPdf: (clientId: string, deliveryIds: string[]) =>
    requestBlob("/api/company/payouts/pdf", { method: "POST", body: { clientId, deliveryIds } }),

  /** Re-downloads the receipt (PDF) of a validated payout. */
  downloadReceiptPdf: (payoutId: string) =>
    requestBlob(`/api/company/payouts/${encodeURIComponent(payoutId)}/pdf`),
};

// ---------------------------------------------------------------------------
// Client returns — /api/company/returns
// ---------------------------------------------------------------------------
// Canceled packages are handed back to their client (Expéditeur). Flow:
//   1. `preview`   lists the client's canceled packages not yet handed back;
//   2. `downloadPdf` generates the return slip (PDF) for the selected
//      packages — read-only, nothing changes server-side. The slip lists the
//      packages, the return fees due, and has a signature block;
//   3. the slip is printed, signed by the client, and the fees are paid;
//   4. `validate` records the handover and stamps exactly these packages
//      (rejects with 409 any that were handed back in the meantime).
// See src/RETURNS_API.md for the full backend contract.

export const companyReturnsApi = {
  /** Canceled packages of a client that haven't been handed back yet, and the company's return fee. */
  preview: (clientId: string) =>
    request<ClientReturnPreview>(`/api/company/returns/preview?clientId=${encodeURIComponent(clientId)}`, {
      method: "GET",
    }),

  /** Generates the printable return slip (PDF) for these packages. Does not change any data. */
  downloadPdf: (clientId: string, deliveryIds: string[]) =>
    requestBlob("/api/company/returns/pdf", { method: "POST", body: { clientId, deliveryIds } }),

  /** Confirms the handover (slip signed, fees paid): marks exactly these packages as returned to the client. */
  validate: (clientId: string, deliveryIds: string[]) =>
    request<ClientReturn>("/api/company/returns", { method: "POST", body: { clientId, deliveryIds } }),

  /** Past confirmed handovers of a client, newest first. */
  history: (clientId: string) =>
    request<ClientReturn[]>(`/api/company/returns?clientId=${encodeURIComponent(clientId)}`, { method: "GET" }),

  /** Re-downloads the return slip of a past handover. */
  downloadReceiptPdf: (returnId: string) =>
    requestBlob(`/api/company/returns/${encodeURIComponent(returnId)}/pdf`),
};

// ---------------------------------------------------------------------------
// Driver settlements — /api/company/driver-settlements
// ---------------------------------------------------------------------------
// End-of-round closing: the driver hands back the cash of the delivered
// packages and the packages that failed. `preview` lists what the driver still
// has to close; `validate` switches the statuses permanently (delivered ids →
// "delivered", returned ids → "EN-DEP-FAILD") and rejects (409) any package
// that was closed in the meantime, so a package can never be closed twice.

export const companyDriverSettlementsApi = {
  /** Packages still to close for a driver (EN-LIV / delivered but not yet cashed in). */
  preview: (driverId: string) =>
    request<DriverSettlementPreview>(
      `/api/company/driver-settlements/preview?driverId=${encodeURIComponent(driverId)}`,
      { method: "GET" }
    ),

  /** Validates the settlement: exactly these packages are closed with the given outcome. */
  validate: (driverId: string, deliveredIds: string[], returnedIds: string[]) =>
    request<DriverSettlement>("/api/company/driver-settlements", {
      method: "POST",
      body: { driverId, deliveredIds, returnedIds },
    }),

  /** Past settlements of a driver, newest first. */
  history: (driverId: string) =>
    request<DriverSettlement[]>(`/api/company/driver-settlements?driverId=${encodeURIComponent(driverId)}`, {
      method: "GET",
    }),
};

// ---------------------------------------------------------------------------
// Stats — /api/company/stats
// ---------------------------------------------------------------------------

export const companyStatsApi = {
  get: (rangeDays: number = 14) =>
    request<CompanyStats>(`/api/company/stats?range=${rangeDays}`, { method: "GET" }),
};

// ---------------------------------------------------------------------------
// Warehouse scan stations — /api/open/company/{companyId}/stations
// ---------------------------------------------------------------------------
// Public (no auth), scoped strictly to the given companyId — mirrors the
// "no auth, scoped to one id" contract already used for the customer-facing
// /api/open/deliveries/* routes in lib/api.ts. Powers the three scan-only
// screens (see src/pages/company/CompanyStation*.tsx): a laser scanner
// "types" a package id into the page then sends Enter, which fires one of
// the calls below.
export const companyStationsApi = {
  /** Public, minimal company info (name) to display on the unauthenticated screen. */
  getPublicInfo: (companyId: string) =>
    request<PublicCompanyInfo>(`/api/open/company/${encodeURIComponent(companyId)}`, { method: "GET", auth: false }),

  /** Registers one scan at a given station for a package/delivery id. */
  scan: (companyId: string, station: StationKind, packageId: string) =>
    request<StationScanResult>(`/api/open/company/${encodeURIComponent(companyId)}/stations/${station}/scan`, {
      method: "POST",
      body: { packageId },
      auth: false,
    }),

  /**
   * "Contrôle des retours" station — step 1. Loads the scanned package with
   * its full history (journal, call attempts, reschedules...). Read-only:
   * nothing changes on the package until `decideReturnCheck` is called.
   * Rejects with a 404 ApiError when the id doesn't match a package of this company.
   */
  lookupReturnCheck: (companyId: string, packageId: string, signal?: AbortSignal) =>
    request<ClientDelivery>(
      `/api/open/company/${encodeURIComponent(companyId)}/stations/return-check/${encodeURIComponent(packageId)}`,
      { method: "GET", auth: false, signal }
    ),

  /**
   * "Contrôle des retours" station — step 2. The employee's decision on the
   * scanned package. `return` cancels it for good (status → CANCELED, return
   * fees apply at the client's payout); `resend` launches a new delivery
   * attempt (status back to the delivery flow, `rescheduleCount` + 1). The
   * backend appends a journal entry either way and returns the updated package.
   * Rejects with a 409 ApiError when the package isn't awaiting a decision.
   */
  decideReturnCheck: (companyId: string, packageId: string, input: { decision: ReturnCheckDecision; note?: string }) =>
    request<ClientDelivery>(
      `/api/open/company/${encodeURIComponent(companyId)}/stations/return-check/${encodeURIComponent(packageId)}/decision`,
      { method: "POST", body: input, auth: false }
    ),
};
