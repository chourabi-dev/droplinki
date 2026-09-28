import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Delivery } from "@/types";
import { deliveriesApi, CreateDeliveryInput, ApiError, isNetworkError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Pusher from "pusher-js";
 
interface DeliveryContextValue {
  deliveries: Delivery[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getDelivery: (id: string) => Delivery | undefined;
  fetchDelivery: (id: string) => Promise<Delivery>;
  createDelivery: (input: CreateDeliveryInput) => Promise<Delivery>;
  markDelivered: (id: string) => Promise<void>;
}

const DeliveryContext = createContext<DeliveryContextValue | undefined>(undefined);

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, driver } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Merges a delivery received in real time (Pusher) into local state. */
  const mergeDelivery = useCallback((delivery: Delivery) => {
    setDeliveries((prev) => {
      const exists = prev.some((d) => d.id === delivery.id);
      return exists ? prev.map((d) => (d.id === delivery.id ? delivery : d)) : [delivery, ...prev];
    });
  }, []);

  // Realtime updates: as soon as the customer opens the tracking link or
  // shares their position, the backend broadcasts the updated delivery on
  // the driver's private Pusher channel. Both the deliveries list and the
  // delivery details page read from this same context, so merging here
  // auto-refreshes both UIs without any polling.

   useEffect(() => {
      if(driver != null){
          // we need to subscribe to this delevery id
    
        const pusher = new Pusher (
            "e43e09207961f9d8d94e",
            {
                cluster: "ap2",
                forceTLS: true,
            }
        );
        const driverChannelID = `driver-${driver.email}`
 
        const channel = pusher.subscribe(driverChannelID);
    
        channel.bind("DELIVERIES-UPDATES", (data:any) => {
            
          refresh();
            
        });
    
      
      
      }
    },[]);

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

  // Fetch the driver's deliveries from the backend once authenticated.
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setDeliveries([]);
    }
  }, [isAuthenticated, refresh]);

  const getDelivery = useCallback((id: string) => deliveries.find((d) => d.id === id), [deliveries]);

  const fetchDelivery = useCallback(
    async (id: string) => {
      const delivery = await deliveriesApi.get(id);
      mergeDelivery(delivery);
      return delivery;
    },
    [mergeDelivery]
  );

  const createDelivery = useCallback(async (input: CreateDeliveryInput) => {
    const delivery = await deliveriesApi.create(input);
    setDeliveries((prev) => [delivery, ...prev]);
    return delivery;
  }, []);

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
      createDelivery,
      markDelivered,
    }),
    [deliveries, isLoading, error, refresh, getDelivery, fetchDelivery, createDelivery, markDelivered]
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
