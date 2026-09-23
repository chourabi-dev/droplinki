import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Company } from "@/types";
import {
  companyAuthApi,
  getCompanyToken,
  setCompanyToken,
  getStoredCompany,
  setStoredCompany,
  ApiError,
  isNetworkError,
} from "@/lib/companyApi";

interface CompanyAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  company: Company | null;
  /** Set when a token exists but we couldn't validate it (network/CORS/5xx) — as opposed to a confirmed 401. */
  authCheckError: string | null;
  retryAuthCheck: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { name: string; phone: string; email: string; password: string; taxId: string; headOfficeAddress: string }) => Promise<void>;
  logout: () => void;
}

const CompanyAuthContext = createContext<CompanyAuthContextValue | undefined>(undefined);

export function CompanyAuthProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!getCompanyToken());
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Same restore-then-revalidate flow as the driver AuthContext: read the
  // cached session instantly, confirm it with the backend in the
  // background, and only clear it on an explicit 401.
  useEffect(() => {
    const token = getCompanyToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const cached = getStoredCompany();
    if (cached) {
      setCompany(cached);
      setIsLoading(false);
    }

    setAuthCheckError(null);
    companyAuthApi
      .me()
      .then((c) => {
        setCompany(c);
        setStoredCompany(c);
        setAuthCheckError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setCompanyToken(null);
          setStoredCompany(null);
          setCompany(null);
          return;
        }
        if (!cached) {
          setAuthCheckError(companyAuthErrorMessage(err));
        }
      })
      .finally(() => setIsLoading(false));
  }, [retryCount]);

  const retryAuthCheck = useCallback(() => setRetryCount((c) => c + 1), []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, company: c } = await companyAuthApi.login(email, password);
    setCompanyToken(token);
    setStoredCompany(c);
    setCompany(c);
  }, []);

  const signup = useCallback(
    async (input: { name: string; phone: string; email: string; password: string; taxId: string; headOfficeAddress: string }) => {
      const { token, company: c } = await companyAuthApi.register(input);
      setCompanyToken(token);
      setStoredCompany(c);
      setCompany(c);
    },
    []
  );

  const logout = useCallback(() => {
    setCompanyToken(null);
    setStoredCompany(null);
    setCompany(null);
  }, []);

  return (
    <CompanyAuthContext.Provider
      value={{
        isAuthenticated: !!company,
        isLoading,
        company,
        authCheckError,
        retryAuthCheck,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </CompanyAuthContext.Provider>
  );
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) throw new Error("useCompanyAuth must be used within CompanyAuthProvider");
  return ctx;
}

export function companyAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Le serveur est injoignable. Réessayez plus tard.";
  return "Une erreur inattendue est survenue.";
}
