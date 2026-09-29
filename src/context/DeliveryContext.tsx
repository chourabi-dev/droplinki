import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Delivery } from "@/types";
import { deliveriesApi, ApiError, isNetworkError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Pusher from "pusher-js";

/**
 * The driver's assigned deliveries. Read-only from the driver's point of
 * view: companies create and assign deliveries, drivers execute them.
 */
interface DeliveryContextValue {
  deliveries: Delivery[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getDelivery: (id: string) => Delivery | undefined;
  fetchDelivery: (id: string) => Promise<Delivery>;
  /** Merge a delivery returned by the API (call log, reschedule...) into local state. */
  updateDelivery: (delivery: Delivery) => void;
  markDelivered: (id: string) => Promise<void>;
}

const DeliveryContext = createContext<DeliveryContextValue | undefined>(undefined);

const PUSHER_KEY = (import.meta.env.VITE_PUSHER_KEY as string) || "e43e09207961f9d8d94e";
const PUSHER_CLUSTER = (import.meta.env.VITE_PUSHER_CLUSTER as string) || "ap2";

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, driver } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergeDelivery = useCallback((delivery: Delivery) => {
    setDeliveries((prev) => {
      const exists = prev.some((d) => d.id === delivery.id);
      return exists ? prev.map((d) => (d.id === delivery.id ? delivery : d)) : [delivery, ...prev];
    });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await deliveriesApi.list();
      setDeliveries(data);
    } catch (err) {
      setError(deliveryErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load once authenticated.
  useEffect(() => {
    if (isAuthenticated) refresh();
    else setDeliveries([]);
  }, [isAuthenticated, refresh]);

  // Realtime: the backend pings the driver's private channel whenever the
  // company assigns / changes a delivery or a customer shares their position.
  // (Previously this effect ran once with `[]` deps, i.e. BEFORE the driver
  // was loaded, so it never subscribed, and it never cleaned up.)
  const driverEmail = driver?.email;
  useEffect(() => {
    if (!driverEmail) return;
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER, forceTLS: true });
    const channelName = `driver-${driverEmail}`;
    const channel = pusher.subscribe(channelName);
    channel.bind("DELIVERIES-UPDATES", () => {
      void refresh();
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [driverEmail, refresh]);

  const getDelivery = useCallback((id: string) => deliveries.find((d) => d.id === id), [deliveries]);

  const fetchDelivery = useCallback(
    async (id: string) => {
      const delivery = await deliveriesApi.get(id);
      mergeDelivery(delivery);
      return delivery;
    },
    [mergeDelivery]
  );

  const markDelivered = useCallback(async (id: string) => {
    const updated = await deliveriesApi.markDelivered(id);
    setDeliveries((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }, []);

  const value = useMemo(
    () => ({
      deliveries,
      isLoading,
      error,
      refresh,
      getDelivery,
      fetchDelivery,
      updateDelivery: mergeDelivery,
      markDelivered,
    }),
    [deliveries, isLoading, error, refresh, getDelivery, fetchDelivery, mergeDelivery, markDelivered]
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDeliveries() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDeliveries must be used within DeliveryProvider");
  return ctx;
}

export function deliveryErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
