import {
  Company,
  CompanyDelivery,
  CompanyDriver,
  CompanyStats,
  CallOutcome,
  CsvImportRow,
  Governorate,
  Delegation,
  DeliveryZone,
  VehicleType,
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
      "Impossible de joindre le serveur. Vérifiez que le backend Symfony tourne sur " + API_BASE_URL,
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
// Each zone belongs to a company and is tied to exactly one delegation
// (picked via the governorate → delegation cascade above).

export interface CreateDeliveryZoneInput {
  name: string;
  nameAr: string;
  description?: string;
  isActive: boolean;
  delegationId: string;
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

export const companyDriversApi = {
  list: () => request<CompanyDriver[]>("/api/company/drivers", { method: "GET" }),

  create: (input: CreateCompanyDriverInput) =>
    request<CompanyDriver>("/api/company/drivers", { method: "POST", body: input }),

  update: (id: string, input: Partial<CreateCompanyDriverInput> & { status?: CompanyDriver["status"] }) =>
    request<CompanyDriver>(`/api/company/drivers/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),

  remove: (id: string) =>
    request<void>(`/api/company/drivers/${encodeURIComponent(id)}`, { method: "DELETE" }),
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

export interface LogCallInput {
  outcome: CallOutcome;
  note?: string;
  latitude?: number;
  longitude?: number;
}

export const companyDeliveriesApi = {
  list: () => request<CompanyDelivery[]>("/api/company/deliveries", { method: "GET" }),

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
};

// ---------------------------------------------------------------------------
// Stats — /api/company/stats
// ---------------------------------------------------------------------------

export const companyStatsApi = {
  get: (rangeDays: number = 14) =>
    request<CompanyStats>(`/api/company/stats?range=${rangeDays}`, { method: "GET" }),
};
