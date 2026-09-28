import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Client } from "@/types";
import { companyClientsApi, CreateCompanyClientInput, ApiError, isNetworkError } from "@/lib/companyApi";
import { useCompanyAuth } from "@/context/CompanyAuthContext";

interface CompanyClientContextValue {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getClient: (id: string) => Client | undefined;
  addClient: (input: CreateCompanyClientInput) => Promise<Client>;
  updateClient: (id: string, input: Partial<CreateCompanyClientInput> & { status?: Client["status"] }) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
}

const CompanyClientContext = createContext<CompanyClientContextValue | undefined>(undefined);

export function CompanyClientProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useCompanyAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await companyClientsApi.list();
      setClients(data);
    } catch (err) {
      setError(companyClientErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setClients([]);
  }, [isAuthenticated, refresh]);

  const getClient = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);

  const addClient = useCallback(async (input: CreateCompanyClientInput) => {
    const client = await companyClientsApi.create(input);
    setClients((prev) => [client, ...prev]);
    return client;
  }, []);

  const updateClient = useCallback(
    async (id: string, input: Partial<CreateCompanyClientInput> & { status?: Client["status"] }) => {
      const updated = await companyClientsApi.update(id, input);
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
    },
    []
  );

  const removeClient = useCallback(async (id: string) => {
    await companyClientsApi.remove(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({ clients, isLoading, error, refresh, getClient, addClient, updateClient, removeClient }),
    [clients, isLoading, error, refresh, getClient, addClient, updateClient, removeClient]
  );

  return <CompanyClientContext.Provider value={value}>{children}</CompanyClientContext.Provider>;
}

export function useCompanyClients() {
  const ctx = useContext(CompanyClientContext);
  if (!ctx) throw new Error("useCompanyClients must be used within CompanyClientProvider");
  return ctx;
}

export function companyClientErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
