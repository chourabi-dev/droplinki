import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { ClientDelivery } from "@/types";
import { clientDeliveriesApi, CreateClientDeliveryInput, ApiError, isNetworkError } from "@/lib/clientApi";
import { useClientAuth } from "@/context/ClientAuthContext";

interface ClientDeliveryContextValue {
  deliveries: ClientDelivery[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getDelivery: (id: string) => ClientDelivery | undefined;
  fetchDelivery: (id: string) => Promise<ClientDelivery>;
  createDelivery: (input: CreateClientDeliveryInput) => Promise<ClientDelivery>;
}

const ClientDeliveryContext = createContext<ClientDeliveryContextValue | undefined>(undefined);

export function ClientDeliveryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useClientAuth();
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergeDelivery = useCallback((delivery: ClientDelivery) => {
    setDeliveries((prev) => {
      const exists = prev.some((d) => d.id === delivery.id);
      return exists ? prev.map((d) => (d.id === delivery.id ? delivery : d)) : [delivery, ...prev];
    });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientDeliveriesApi.list();
      setDeliveries(data);
    } catch (err) {
      setError(clientDeliveryErrorMessage(err));
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
      const delivery = await clientDeliveriesApi.get(id);
      mergeDelivery(delivery);
      return delivery;
    },
    [mergeDelivery]
  );

  const createDelivery = useCallback(async (input: CreateClientDeliveryInput) => {
    const delivery = await clientDeliveriesApi.create(input);
    setDeliveries((prev) => [delivery, ...prev]);
    return delivery;
  }, []);

  const value = useMemo(
    () => ({ deliveries, isLoading, error, refresh, getDelivery, fetchDelivery, createDelivery }),
    [deliveries, isLoading, error, refresh, getDelivery, fetchDelivery, createDelivery]
  );

  return <ClientDeliveryContext.Provider value={value}>{children}</ClientDeliveryContext.Provider>;
}

export function useClientDeliveries() {
  const ctx = useContext(ClientDeliveryContext);
  if (!ctx) throw new Error("useClientDeliveries must be used within ClientDeliveryProvider");
  return ctx;
}

export function clientDeliveryErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
