import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Driver } from "@/types";
import { authApi, driverApi, getToken, setToken, getStoredUser, setStoredUser, ApiError, isNetworkError } from "@/lib/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  driver: Driver | null;
  /** Set when a token exists but we couldn't validate it (network/CORS/5xx) — as opposed to a confirmed 401. */
  authCheckError: string | null;
  retryAuthCheck: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { name: string; phone: string; email: string; password: string }) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  upgradeToPro: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!getToken());
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // On load, restore the session from localStorage first (instant, no flash
  // of "logged out" on refresh), then revalidate with the backend in the
  // background. We only ever clear the session when the backend explicitly
  // rejects the token (401) — a network error, CORS failure, or the backend
  // being briefly unreachable must NOT log the user out. When we *can't*
  // confirm the session at all (no cached user + backend unreachable), we
  // surface that distinctly via authCheckError instead of silently treating
  // the person as logged out.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const cachedUser = getStoredUser();
    if (cachedUser) {
      setDriver(cachedUser);
      setIsLoading(false);
    }

    setAuthCheckError(null);
    authApi
      .me()
      .then((user) => {
        setDriver(user);
        setStoredUser(user);
        setAuthCheckError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          // Backend explicitly rejected this token — really logged out.
          setToken(null);
          setStoredUser(null);
          setDriver(null);
          return;
        }
        // Network error, CORS block, 5xx, etc. Keep any cached session as-is,
        // but if we had nothing cached, we genuinely can't tell if the user
        // is logged in — surface that instead of pretending they're logged out.
        if (!cachedUser) {
          setAuthCheckError(authErrorMessage(err));
        }
      })
      .finally(() => setIsLoading(false));
  }, [retryCount]);

  const retryAuthCheck = useCallback(() => setRetryCount((c) => c + 1), []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    setToken(token);
    setStoredUser(user);
    setDriver(user);
  }, []);

  const signup = useCallback(
    async (input: { name: string; phone: string; email: string; password: string }) => {
      const { token, user } = await authApi.register(input);
      setToken(token);
      setStoredUser(user);
      setDriver(user);
    },
    []
  );

  const loginWithGoogle = useCallback(async (credential: string) => {
    const { token, user } = await authApi.loginWithGoogle(credential);
    setToken(token);
    setStoredUser(user);
    setDriver(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setDriver(null);
  }, []);

  const upgradeToPro = useCallback(async () => {
    const updated = await driverApi.upgradeToPro();
    setStoredUser(updated);
    setDriver(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!driver,
        isLoading,
        driver,
        authCheckError,
        retryAuthCheck,
        login,
        signup,
        loginWithGoogle,
        logout,
        upgradeToPro,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Extract a user-facing message from an auth error. */
export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Le serveur est injoignable. Réessayez plus tard.";
  return "Une erreur inattendue est survenue.";
}
