import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { DeliveryZone } from "@/types";
import { companyDeliveryZonesApi, CreateDeliveryZoneInput, ApiError, isNetworkError } from "@/lib/companyApi";
import { useCompanyAuth } from "@/context/CompanyAuthContext";

interface CompanyDeliveryZoneContextValue {
  zones: DeliveryZone[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getZone: (id: string) => DeliveryZone | undefined;
  zonesForDelegation: (delegationId: string) => DeliveryZone[];
  addZone: (input: CreateDeliveryZoneInput) => Promise<DeliveryZone>;
  updateZone: (id: string, input: Partial<CreateDeliveryZoneInput>) => Promise<void>;
  removeZone: (id: string) => Promise<void>;
}

const CompanyDeliveryZoneContext = createContext<CompanyDeliveryZoneContextValue | undefined>(undefined);

export function CompanyDeliveryZoneProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useCompanyAuth();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await companyDeliveryZonesApi.list();
      setZones(data);
    } catch (err) {
      setError(companyZoneErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setZones([]);
  }, [isAuthenticated, refresh]);

  const getZone = useCallback((id: string) => zones.find((z) => z.id === id), [zones]);
  const zonesForDelegation = useCallback(
    (delegationId: string) => zones.filter((z) => z.delegationIds.includes(delegationId)),
    [zones]
  );

  const addZone = useCallback(async (input: CreateDeliveryZoneInput) => {
    const zone = await companyDeliveryZonesApi.create(input);
    setZones((prev) => [zone, ...prev]);
    return zone;
  }, []);

  const updateZone = useCallback(async (id: string, input: Partial<CreateDeliveryZoneInput>) => {
    const updated = await companyDeliveryZonesApi.update(id, input);
    setZones((prev) => prev.map((z) => (z.id === id ? updated : z)));
  }, []);

  const removeZone = useCallback(async (id: string) => {
    await companyDeliveryZonesApi.remove(id);
    setZones((prev) => prev.filter((z) => z.id !== id));
  }, []);

  const value = useMemo(
    () => ({ zones, isLoading, error, refresh, getZone, zonesForDelegation, addZone, updateZone, removeZone }),
    [zones, isLoading, error, refresh, getZone, zonesForDelegation, addZone, updateZone, removeZone]
  );

  return <CompanyDeliveryZoneContext.Provider value={value}>{children}</CompanyDeliveryZoneContext.Provider>;
}

export function useCompanyDeliveryZones() {
  const ctx = useContext(CompanyDeliveryZoneContext);
  if (!ctx) throw new Error("useCompanyDeliveryZones must be used within CompanyDeliveryZoneProvider");
  return ctx;
}

export function companyZoneErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
