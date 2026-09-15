import { Delivery, Driver } from "@/types";

/**
 * Base URL of the Symfony backend. Configure with VITE_API_BASE_URL in .env.
 * Locally the Symfony backend runs on https://droplinki-backend.chourabi-e-business-solutions.com/.
 *
 * NOTE: as of this integration the Symfony backend does not implement these
 * routes yet. This client is written against the contract documented in
 * README.md ("Backend API contract") so the backend team can implement
 * matching endpoints. Every call below will fail with a network / 404 error
 * until those routes exist — callers must handle that gracefully (this app
 * surfaces it via toasts / inline error states rather than crashing).
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://droplinki-backend.chourabi-e-business-solutions.com/").replace(/\/+$/, "");

const TOKEN_KEY = "droplink:token";
const USER_KEY = "droplink:user";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

/**
 * The user is cached alongside the token so a page refresh restores the
 * session instantly (no flash of "logged out"), even before the background
 * /api/auth/me check completes. See getStoredUser/setStoredUser below.
 */
export function getStoredUser(): Driver | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Driver) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: Driver | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // ignore storage errors
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** True when the error is a network-level failure (backend unreachable). */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
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
    const token = getToken();
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

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthResponse {
  token: string;
  user: Driver;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthResponse>("/api/login_check", { method: "POST", body: { username, password }, auth: false }),

  register: (input: { name: string; phone: string; email: string; password: string }) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: input, auth: false }),

  loginWithGoogle: (credential: string) =>
    request<AuthResponse>("/api/auth/google", { method: "POST", body: { credential }, auth: false }),

  me: () => request<Driver>("/api/auth/me", { method: "GET" }),

  /** Step 1: triggers a 6-digit code sent by email to the account (if it exists). */
  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: { email }, auth: false }),

  /** Step 2: verifies the 6-digit code the user received, before letting them pick a new password. */
  verifyResetCode: (input: { email: string; code: string }) =>
    request<{ message: string }>("/api/auth/verify-reset-code", { method: "POST", body: input, auth: false }),

  /** Step 3: sets the new password. Re-sends the code so the backend can re-validate it atomically. */
  resetPassword: (input: { email: string; code: string; password: string }) =>
    request<{ message: string }>("/api/auth/reset-password", { method: "POST", body: input, auth: false }),
};

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------

export interface CreateDeliveryInput {
  customerName: string;
  customerPhone: string;
  reference?: string;
  amount?: number;
  notes?: string;
}

export const deliveriesApi = {
  list: () => request<Delivery[]>("/api/deliveries", { method: "GET" }),

  get: (id: string) => request<Delivery>(`/api/deliveries/${encodeURIComponent(id)}`, { method: "GET" }),

  create: (input: CreateDeliveryInput) =>
    request<Delivery>("/api/deliveries", { method: "POST", body: input }),

  markDelivered: (id: string) =>
    request<Delivery>(`/api/deliveries/${encodeURIComponent(id)}/delivered`, { method: "PATCH" }),

  // Public endpoints used by the customer-facing tracking page (no auth token required).
  getPublic: (id: string) =>
    request<Delivery>(`/api/open/deliveries/${encodeURIComponent(id)}`, { method: "GET", auth: false }),

  markLinkOpened: (id: string) =>
    request<void>(`/api/open/deliveries/${encodeURIComponent(id)}/opened`, { method: "POST", auth: false }),

  shareLocation: (id: string, latitude: number, longitude: number) =>
    request<Delivery>(`/api/open/deliveries/${encodeURIComponent(id)}/location`, {
      method: "POST",
      body: { latitude, longitude },
      auth: false,
    }),
};

// ---------------------------------------------------------------------------
// Driver / subscription
// ---------------------------------------------------------------------------

export const driverApi = {
  upgradeToPro: () => request<Driver>("/api/driver/upgrade", { method: "POST" }),
};