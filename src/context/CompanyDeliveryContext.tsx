import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { CompanyDelivery, CsvImportRow, CallOutcome } from "@/types";
import {
  companyDeliveriesApi,
  CreateCompanyDeliveryInput,
  ImportCsvResult,
  ApiError,
  isNetworkError,
} from "@/lib/companyApi";
import { useCompanyAuth } from "@/context/CompanyAuthContext";

interface CompanyDeliveryContextValue {
  deliveries: CompanyDelivery[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getDelivery: (id: string) => CompanyDelivery | undefined;
  fetchDelivery: (id: string) => Promise<CompanyDelivery>;
  createDelivery: (input: CreateCompanyDeliveryInput) => Promise<CompanyDelivery>;
  importCsv: (rows: CsvImportRow[]) => Promise<ImportCsvResult>;
  assignDriver: (id: string, driverId: string | null) => Promise<void>;
  logCall: (id: string, input: { outcome: CallOutcome; note?: string; latitude?: number; longitude?: number }) => Promise<CompanyDelivery>;
  markDelivered: (id: string) => Promise<void>;
}

const CompanyDeliveryContext = createContext<CompanyDeliveryContextValue | undefined>(undefined);

export function CompanyDeliveryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useCompanyAuth();
  const [deliveries, setDeliveries] = useState<CompanyDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergeDelivery = useCallback((delivery: CompanyDelivery) => {
    setDeliveries((prev) => {
      const exists = prev.some((d) => d.id === delivery.id);
      return exists ? prev.map((d) => (d.id === delivery.id ? delivery : d)) : [delivery, ...prev];
    });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await companyDeliveriesApi.list();
      setDeliveries(data);
    } catch (err) {
      setError(companyDeliveryErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setDeliveries([]);
  }, [isAuthenticated, refresh]);

  const getDelivery = useCallback((id: string) => deliveries.find((d) => d.id === id), [deliveries]);

  const fetchDelivery = useCallback(
    async (id: string) => {
      const delivery = await companyDeliveriesApi.get(id);
      mergeDelivery(delivery);
      return delivery;
    },
    [mergeDelivery]
  );

  const createDelivery = useCallback(async (input: CreateCompanyDeliveryInput) => {
    const delivery = await companyDeliveriesApi.create(input);
    setDeliveries((prev) => [delivery, ...prev]);
    return delivery;
  }, []);

  const importCsv = useCallback(async (rows: CsvImportRow[]) => {
    const result = await companyDeliveriesApi.importCsv(rows);
    if (result.created.length) {
      setDeliveries((prev) => [...result.created, ...prev]);
    }
    return result;
  }, []);

  const assignDriver = useCallback(async (id: string, driverId: string | null) => {
    const updated = await companyDeliveriesApi.assignDriver(id, driverId);
    mergeDelivery(updated);
  }, [mergeDelivery]);

  const logCall = useCallback(
    async (id: string, input: { outcome: CallOutcome; note?: string; latitude?: number; longitude?: number }) => {
      const updated = await companyDeliveriesApi.logCall(id, input);
      mergeDelivery(updated);
      return updated;
    },
    [mergeDelivery]
  );

  const markDelivered = useCallback(async (id: string) => {
    const updated = await companyDeliveriesApi.markDelivered(id);
    mergeDelivery(updated);
  }, [mergeDelivery]);

  const value = useMemo(
    () => ({
      deliveries,
      isLoading,
      error,
      refresh,
      getDelivery,
      fetchDelivery,
      createDelivery,
      importCsv,
      assignDriver,
      logCall,
      markDelivered,
    }),
    [deliveries, isLoading, error, refresh, getDelivery, fetchDelivery, createDelivery, importCsv, assignDriver, logCall, markDelivered]
  );

  return <CompanyDeliveryContext.Provider value={value}>{children}</CompanyDeliveryContext.Provider>;
}

export function useCompanyDeliveries() {
  const ctx = useContext(CompanyDeliveryContext);
  if (!ctx) throw new Error("useCompanyDeliveries must be used within CompanyDeliveryProvider");
  return ctx;
}

export function companyDeliveryErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
