import { Client, ClientDelivery } from "@/types";
import { ApiError, isNetworkError } from "@/lib/api";

/**
 * Base URL of the Symfony backend — same host as the driver/company apps
 * (VITE_API_BASE_URL), but every route below lives under its own
 * `/api/client/...` namespace so it can be implemented and deployed
 * independently.
 *
 * NOTE: as of this integration the Symfony backend does not implement these
 * routes yet (same status as the driver and company APIs — see README.md).
 * This client is written against that documented contract; calls will fail
 * with a network / 404 error until the backend exposes them, and callers
 * must handle that gracefully (surfaced via toasts / inline error states,
 * never a crash).
 */
const API_BASE_URL = ("http://localhost:8000/").replace(/\/+$/, "");

// Storage keys are namespaced separately from the driver ("droplink:*") and
// company ("droplink:company:*") apps so a person can be logged in as a
// driver, a company and a client at the same time (e.g. several tabs),
// without any session clobbering another.
const TOKEN_KEY = "droplink:client:token";
const USER_KEY = "droplink:client:user";

export function getClientToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setClientToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export function getStoredClient(): Client | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Client) : null;
  } catch {
    return null;
  }
}

export function setStoredClient(client: Client | null) {
  try {
    if (client) localStorage.setItem(USER_KEY, JSON.stringify(client));
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
    const token = getClientToken();
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
// Auth — /api/client/auth
// ---------------------------------------------------------------------------
// Client accounts are created by a company from its dashboard (see
// companyClientsApi in lib/companyApi.ts) — there is no self-service signup
// here, only login + password recovery.

export interface ClientAuthResponse {
  token: string;
  client: Client;
}

export const clientAuthApi = {
  login: (email: string, password: string) =>
    request<ClientAuthResponse>("/api/client/auth/login", { method: "POST", body: { username:email, password }, auth: false }),

  me: () => request<Client>("/api/client/me", { method: "GET" }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/client/auth/forgot-password", { method: "POST", body: { email }, auth: false }),

  verifyResetCode: (input: { email: string; code: string }) =>
    request<{ message: string }>("/api/client/auth/verify-reset-code", { method: "POST", body: input, auth: false }),

  resetPassword: (input: { email: string; code: string; password: string }) =>
    request<{ message: string }>("/api/client/auth/reset-password", { method: "POST", body: input, auth: false }),
};

// ---------------------------------------------------------------------------
// Deliveries — /api/client/deliveries
// ---------------------------------------------------------------------------
// The client only creates deliveries for their own recipients and tracks
// them — no driver assignment, no call log (that's the company's job).

export interface CreateClientDeliveryInput {
  recipientFirstName: string;
  recipientLastName: string;
  recipientPhone1: string;
  recipientPhone2?: string;
  address: string;
  helpText?: string;
  reference?: string;
  amount?: number;
  /** When true, the backend generates a `shareUrl` the client can send to the recipient. */
  generateValidationLink: boolean;
}

export const clientDeliveriesApi = {
  list: () => request<ClientDelivery[]>("/api/client/deliveries", { method: "GET" }),

  get: (id: string) => request<ClientDelivery>(`/api/client/deliveries/${encodeURIComponent(id)}`, { method: "GET" }),

  create: (input: CreateClientDeliveryInput) =>
    request<ClientDelivery>("/api/client/deliveries", { method: "POST", body: input }),
};
