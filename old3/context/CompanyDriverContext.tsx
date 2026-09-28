import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { CompanyDriver } from "@/types";
import { companyDriversApi, CreateCompanyDriverInput, ApiError, isNetworkError } from "@/lib/companyApi";
import { useCompanyAuth } from "@/context/CompanyAuthContext";

interface CompanyDriverContextValue {
  drivers: CompanyDriver[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getDriver: (id: string) => CompanyDriver | undefined;
  addDriver: (input: CreateCompanyDriverInput) => Promise<CompanyDriver>;
  updateDriver: (id: string, input: Partial<CreateCompanyDriverInput> & { status?: CompanyDriver["status"] }) => Promise<void>;
  removeDriver: (id: string) => Promise<void>;
}

const CompanyDriverContext = createContext<CompanyDriverContextValue | undefined>(undefined);

export function CompanyDriverProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useCompanyAuth();
  const [drivers, setDrivers] = useState<CompanyDriver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await companyDriversApi.list();
      setDrivers(data);
    } catch (err) {
      setError(companyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setDrivers([]);
  }, [isAuthenticated, refresh]);

  const getDriver = useCallback((id: string) => drivers.find((d) => d.id === id), [drivers]);

  const addDriver = useCallback(async (input: CreateCompanyDriverInput) => {
    const driver = await companyDriversApi.create(input);
    setDrivers((prev) => [driver, ...prev]);
    return driver;
  }, []);

  const updateDriver = useCallback(
    async (id: string, input: Partial<CreateCompanyDriverInput> & { status?: CompanyDriver["status"] }) => {
      const updated = await companyDriversApi.update(id, input);
      setDrivers((prev) => prev.map((d) => (d.id === id ? updated : d)));
    },
    []
  );

  const removeDriver = useCallback(async (id: string) => {
    await companyDriversApi.remove(id);
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const value = useMemo(
    () => ({ drivers, isLoading, error, refresh, getDriver, addDriver, updateDriver, removeDriver }),
    [drivers, isLoading, error, refresh, getDriver, addDriver, updateDriver, removeDriver]
  );

  return <CompanyDriverContext.Provider value={value}>{children}</CompanyDriverContext.Provider>;
}

export function useCompanyDrivers() {
  const ctx = useContext(CompanyDriverContext);
  if (!ctx) throw new Error("useCompanyDrivers must be used within CompanyDriverProvider");
  return ctx;
}

export function companyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
