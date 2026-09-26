import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Client } from "@/types";
import {
  clientAuthApi,
  getClientToken,
  setClientToken,
  getStoredClient,
  setStoredClient,
  ApiError,
  isNetworkError,
} from "@/lib/clientApi";

interface ClientAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  client: Client | null;
  /** Set when a token exists but we couldn't validate it (network/CORS/5xx) — as opposed to a confirmed 401. */
  authCheckError: string | null;
  retryAuthCheck: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextValue | undefined>(undefined);

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!getClientToken());
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Same restore-then-revalidate flow as the driver/company auth contexts:
  // read the cached session instantly, confirm it with the backend in the
  // background, and only clear it on an explicit 401.
  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const cached = getStoredClient();
    if (cached) {
      setClient(cached);
      setIsLoading(false);
    }

    setAuthCheckError(null);
    clientAuthApi
      .me()
      .then((c) => {
        setClient(c);
        setStoredClient(c);
        setAuthCheckError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setClientToken(null);
          setStoredClient(null);
          setClient(null);
          return;
        }
        if (!cached) {
          setAuthCheckError(clientAuthErrorMessage(err));
        }
      })
      .finally(() => setIsLoading(false));
  }, [retryCount]);

  const retryAuthCheck = useCallback(() => setRetryCount((c) => c + 1), []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, client: c } = await clientAuthApi.login(email, password);
    setClientToken(token);
    setStoredClient(c);
    setClient(c);
  }, []);

  const logout = useCallback(() => {
    setClientToken(null);
    setStoredClient(null);
    setClient(null);
  }, []);

  return (
    <ClientAuthContext.Provider
      value={{
        isAuthenticated: !!client,
        isLoading,
        client,
        authCheckError,
        retryAuthCheck,
        login,
        logout,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return ctx;
}

export function clientAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Le serveur est injoignable. Réessayez plus tard.";
  return "Une erreur inattendue est survenue.";
}
