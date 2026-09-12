import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Delivery, DeliveryStatus, TimelineEvent } from "@/types";
import { loadJSON, saveJSON, STORAGE_KEYS } from "@/lib/storage";
import { jitterCoord } from "@/lib/utils";

// Default driver location: Tunis city center (demo default, not hard-coded elsewhere)
export const DEFAULT_DRIVER_LOCATION = { lat: 36.8065, lon: 10.1815 };

function nowISO() {
  return new Date().toISOString();
}

function makeEvent(label: string): TimelineEvent {
  return { id: crypto.randomUUID(), label, timestamp: nowISO() };
}

function seedDeliveries(): Delivery[] {
  const created1 = new Date();
  created1.setHours(10, 42, 0, 0);
  const opened1 = new Date(created1.getTime() + 5 * 60000);
  const received1 = new Date(created1.getTime() + 6 * 60000);

  const created2 = new Date();
  created2.setHours(9, 15, 0, 0);
  const done2 = new Date(created2.getTime() + 40 * 60000);

  const created3 = new Date();
  created3.setHours(11, 5, 0, 0);

  return [
    {
      id: "DL-1042",
      customerName: "Ahmed Trabelsi",
      reference: "CMD-8821",
      amount: 45,
      notes: "Sonner à l'interphone, 2e étage.",
      status: "location_received",
      shareUrl: "/d/DL-1042",
      customerLatitude: 36.812,
      customerLongitude: 10.175,
      driverLatitude: DEFAULT_DRIVER_LOCATION.lat,
      driverLongitude: DEFAULT_DRIVER_LOCATION.lon,
      createdAt: created1.toISOString(),
      linkSentAt: new Date(created1.getTime() + 60000).toISOString(),
      linkOpenedAt: opened1.toISOString(),
      locationReceivedAt: received1.toISOString(),
      timeline: [
        { id: crypto.randomUUID(), label: "Livraison créée", timestamp: created1.toISOString() },
        { id: crypto.randomUUID(), label: "Lien envoyé", timestamp: new Date(created1.getTime() + 60000).toISOString() },
        { id: crypto.randomUUID(), label: "Client a ouvert le lien", timestamp: opened1.toISOString() },
        { id: crypto.randomUUID(), label: "Position reçue", timestamp: received1.toISOString() },
      ],
    },
    {
      id: "DL-1041",
      customerName: "Sarra Ben Youssef",
      reference: "CMD-8810",
      amount: 78,
      status: "delivered",
      shareUrl: "/d/DL-1041",
      customerLatitude: 36.799,
      customerLongitude: 10.189,
      driverLatitude: DEFAULT_DRIVER_LOCATION.lat,
      driverLongitude: DEFAULT_DRIVER_LOCATION.lon,
      createdAt: created2.toISOString(),
      locationReceivedAt: new Date(created2.getTime() + 10 * 60000).toISOString(),
      completedAt: done2.toISOString(),
      timeline: [
        { id: crypto.randomUUID(), label: "Livraison créée", timestamp: created2.toISOString() },
        { id: crypto.randomUUID(), label: "Position reçue", timestamp: new Date(created2.getTime() + 10 * 60000).toISOString() },
        { id: crypto.randomUUID(), label: "Livrée", timestamp: done2.toISOString() },
      ],
    },
    {
      id: "DL-1043",
      customerName: "Mohamed Gharbi",
      reference: "CMD-8830",
      status: "waiting_location",
      shareUrl: "/d/DL-1043",
      driverLatitude: DEFAULT_DRIVER_LOCATION.lat,
      driverLongitude: DEFAULT_DRIVER_LOCATION.lon,
      createdAt: created3.toISOString(),
      linkSentAt: new Date(created3.getTime() + 60000).toISOString(),
      timeline: [
        { id: crypto.randomUUID(), label: "Livraison créée", timestamp: created3.toISOString() },
        { id: crypto.randomUUID(), label: "Lien envoyé", timestamp: new Date(created3.getTime() + 60000).toISOString() },
      ],
    },
  ];
}

interface DeliveryContextValue {
  deliveries: Delivery[];
  getDelivery: (id: string) => Delivery | undefined;
  createDelivery: (input: { customerName: string; reference?: string; amount?: number; notes?: string }) => Delivery;
  markLinkOpened: (id: string) => void;
  setCustomerLocation: (id: string, lat: number, lon: number) => void;
  simulateCustomerLocation: (id: string) => void;
  markDelivered: (id: string) => void;
  resetDemoData: () => void;
}

const DeliveryContext = createContext<DeliveryContextValue | undefined>(undefined);

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>(() =>
    loadJSON<Delivery[]>(STORAGE_KEYS.deliveries, seedDeliveries())
  );

  useEffect(() => {
    saveJSON(STORAGE_KEYS.deliveries, deliveries);
  }, [deliveries]);

  // keep in sync across tabs (driver dashboard + customer page open simultaneously)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEYS.deliveries && e.newValue) {
        try {
          setDeliveries(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getDelivery = useCallback(
    (id: string) => deliveries.find((d) => d.id === id),
    [deliveries]
  );

  const nextId = useCallback(() => {
    const counter = loadJSON<number>(STORAGE_KEYS.counter, 1044);
    const next = counter + 1;
    saveJSON(STORAGE_KEYS.counter, next);
    return `DL-${counter}`;
  }, []);

  const createDelivery: DeliveryContextValue["createDelivery"] = useCallback(
    (input) => {
      const id = nextId();
      const created = nowISO();
      const delivery: Delivery = {
        id,
        customerName: input.customerName,
        reference: input.reference,
        amount: input.amount,
        notes: input.notes,
        status: "waiting_location",
        shareUrl: `/d/${id}`,
        driverLatitude: DEFAULT_DRIVER_LOCATION.lat,
        driverLongitude: DEFAULT_DRIVER_LOCATION.lon,
        createdAt: created,
        timeline: [makeEvent("Livraison créée")],
      };
      setDeliveries((prev) => [delivery, ...prev]);
      return delivery;
    },
    [nextId]
  );

  const markLinkOpened: DeliveryContextValue["markLinkOpened"] = useCallback((id) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== id || d.linkOpenedAt) return d;
        return { ...d, linkOpenedAt: nowISO(), timeline: [...d.timeline, makeEvent("Client a ouvert le lien")] };
      })
    );
  }, []);

  const setCustomerLocation: DeliveryContextValue["setCustomerLocation"] = useCallback((id, lat, lon) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (d.status === "delivered") return d;
        return {
          ...d,
          customerLatitude: lat,
          customerLongitude: lon,
          status: "location_received" as DeliveryStatus,
          locationReceivedAt: nowISO(),
          timeline: [...d.timeline, makeEvent("Position reçue")],
        };
      })
    );
  }, []);

  const simulateCustomerLocation: DeliveryContextValue["simulateCustomerLocation"] = useCallback(
    (id) => {
      const delivery = deliveries.find((d) => d.id === id);
      const base = delivery
        ? { lat: delivery.driverLatitude, lon: delivery.driverLongitude }
        : DEFAULT_DRIVER_LOCATION;
      const { lat, lon } = jitterCoord(base.lat, base.lon, 1.4);
      setCustomerLocation(id, lat, lon);
    },
    [deliveries, setCustomerLocation]
  );

  const markDelivered: DeliveryContextValue["markDelivered"] = useCallback((id) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        return { ...d, status: "delivered" as DeliveryStatus, completedAt: nowISO(), timeline: [...d.timeline, makeEvent("Livrée")] };
      })
    );
  }, []);

  const resetDemoData: DeliveryContextValue["resetDemoData"] = useCallback(() => {
    const fresh = seedDeliveries();
    setDeliveries(fresh);
    saveJSON(STORAGE_KEYS.counter, 1044);
  }, []);

  const value = useMemo(
    () => ({
      deliveries,
      getDelivery,
      createDelivery,
      markLinkOpened,
      setCustomerLocation,
      simulateCustomerLocation,
      markDelivered,
      resetDemoData,
    }),
    [deliveries, getDelivery, createDelivery, markLinkOpened, setCustomerLocation, simulateCustomerLocation, markDelivered, resetDemoData]
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDeliveries() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDeliveries must be used within DeliveryProvider");
  return ctx;
}
