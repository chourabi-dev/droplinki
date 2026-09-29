/**
 * Everything the driver needs to work a day efficiently, in one place:
 *
 *  - the optimized route + "what next" suggestion (lib/routing.ts),
 *  - geocoding of deliveries that have no coordinates (lib/geocode.ts),
 *  - reschedules requested by customers, and the reminders attached to them,
 *  - the call log for the in-app dial flow.
 *
 * Mounted inside AppLayout, i.e. only for an authenticated driver, so the
 * GPS watch and the reminder clock never run on public pages.
 *
 * Persistence: reschedules, reminders and calls are kept in localStorage
 * (per driver) AND sent to the API. If the API call fails (offline, route not
 * deployed yet), the local copy keeps the app fully usable and the request
 * is retried later — the driver never loses a reminder because of the network.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CallAttempt, CallOutcome, Delivery } from "@/types";
import { deliveriesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useDeliveries } from "@/context/DeliveryContext";
import { useToast } from "@/context/ToastContext";
import { LiveLocation, useLiveLocation } from "@/hooks/useLiveLocation";
import { distanceKm } from "@/lib/utils";
import { planRoute, RoutePlan, suggest, Suggestions, exactPoint, scheduledMs } from "@/lib/routing";
import { geocodeDelivery, peekGeocode } from "@/lib/geocode";
import { alertUser, NotifPermission, notificationPermission, requestNotificationPermission } from "@/lib/notify";

export type ReminderKind = "reschedule" | "callback" | "custom";

export interface Reminder {
  id: string;
  deliveryId: string;
  customerName: string;
  kind: ReminderKind;
  /** When the reminder must ring (ISO). */
  at: string;
  label: string;
  /** Set once the alert has been shown. */
  firedAt?: string;
  /** Set when the driver dismissed / handled it. */
  doneAt?: string;
}

interface LocalSchedule {
  scheduledFor: string;
  reason: string;
  count: number;
  synced: boolean;
  note?: string;
}

interface LocalCall extends CallAttempt {
  deliveryId: string;
  synced: boolean;
}

interface Stored {
  schedules: Record<string, LocalSchedule>;
  reminders: Reminder[];
  calls: LocalCall[];
}

const EMPTY: Stored = { schedules: {}, reminders: [], calls: [] };
const MOVE_THRESHOLD_KM = 0.15;
const DEFAULT_REMIND_BEFORE_MIN = 15;

export interface RescheduleRequest {
  scheduledFor: Date;
  reason: string;
  note?: string;
  /** Minutes before the slot to ring. */
  remindBeforeMin: number;
}

export interface CallLogRequest {
  outcome: CallOutcome;
  phoneUsed: "primary" | "secondary";
  note?: string;
}

interface PlannerValue {
  /** Server deliveries with local (not yet synced) reschedules applied. */
  deliveries: Delivery[];
  plan: RoutePlan;
  suggestions: Suggestions;
  driverLocation: LiveLocation | null;
  locationError: string | null;
  /** Deliveries still waiting for an address lookup. */
  geocodingPending: number;

  reminders: Reminder[];
  /** Not done, sorted by time. */
  openReminders: Reminder[];
  /** Fired and not handled yet — shown as a banner. */
  ringingReminders: Reminder[];
  addReminder: (input: { deliveryId: string; customerName: string; at: Date; label: string; kind: ReminderKind }) => void;
  completeReminder: (id: string) => void;
  snoozeReminder: (id: string, minutes: number) => void;
  notificationPermission: NotifPermission;
  enableNotifications: () => Promise<void>;

  reschedule: (delivery: Delivery, req: RescheduleRequest) => Promise<{ synced: boolean }>;
  logCall: (delivery: Delivery, req: CallLogRequest) => Promise<{ synced: boolean }>;
  callsFor: (delivery: Delivery) => CallAttempt[];
}

const Ctx = createContext<PlannerValue | undefined>(undefined);

export function DriverPlannerProvider({ children }: { children: React.ReactNode }) {
  const { driver } = useAuth();
  const { deliveries: serverDeliveries, updateDelivery } = useDeliveries();
  const { showToast } = useToast();
  const { location: driverLocation, error: locationError } = useLiveLocation();

  const storageKey = `droplink:driver:${driver?.email ?? "anon"}:planner:v1`;
  const [store, setStore] = useState<Stored>(EMPTY);
  const loadedKey = useRef<string | null>(null);

  // ---- persistence ------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setStore(raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY);
    } catch {
      setStore(EMPTY);
    }
    loadedKey.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey.current !== storageKey) return; // don't overwrite before the first load
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
    } catch {
      /* ignore */
    }
  }, [store, storageKey]);

  // ---- effective deliveries (server + unsynced local reschedules) --------
  const deliveries = useMemo<Delivery[]>(
    () =>
      serverDeliveries.map((d) => {
        const local = store.schedules[d.id];
        if (!local || d.status === "delivered") return d;
        // Unsynced local schedule wins; a synced one is already reflected by the server copy
        // (and we fall back to it if the server didn't echo the field back).
        if (!local.synced || !d.scheduledFor) {
          return { ...d, scheduledFor: local.scheduledFor, rescheduleReason: local.reason, rescheduleCount: local.count };
        }
        return d;
      }),
    [serverDeliveries, store.schedules]
  );

  // ---- geocoding of deliveries without coordinates ------------------------
  const [geoVersion, setGeoVersion] = useState(0);
  const [geoPending, setGeoPending] = useState(0);
  const geoAttempts = useRef<Map<string, number>>(new Map());
  const geoBusy = useRef(false);

  useEffect(() => {
    const todo = deliveries.filter((d) => {
      if (d.status === "delivered" || exactPoint(d)) return false;
      if (!d.address?.trim() && !d.delegation && !d.gouvernorate) return false;
      if (peekGeocode({ address: d.address, delegation: d.delegation, gouvernorate: d.gouvernorate })) return false;
      const last = geoAttempts.current.get(d.id);
      return !last || Date.now() - last > 5 * 60_000;
    });
    setGeoPending(todo.length);
    if (!todo.length || geoBusy.current) return;
    geoBusy.current = true;
    (async () => {
      let changed = false;
      for (const d of todo) {
        geoAttempts.current.set(d.id, Date.now());
        const g = await geocodeDelivery({ address: d.address, delegation: d.delegation, gouvernorate: d.gouvernorate });
        if (g) changed = true;
      }
      geoBusy.current = false;
      setGeoPending(0);
      if (changed) setGeoVersion((v) => v + 1);
    })();
  }, [deliveries]);

  // ---- stable origin: don't reshuffle the route on every GPS jitter -------
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (!driverLocation) return;
    setOrigin((prev) =>
      !prev || distanceKm(prev.lat, prev.lon, driverLocation.lat, driverLocation.lon) > MOVE_THRESHOLD_KM
        ? { lat: driverLocation.lat, lon: driverLocation.lon }
        : prev
    );
  }, [driverLocation]);

  // minute clock so rescheduled slots enter / leave the route on time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const plan = useMemo(
    () => planRoute(deliveries, { origin, now: new Date() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deliveries, origin, tick, geoVersion]
  );
  const suggestions = useMemo(() => suggest(plan, origin), [plan, origin]);

  // ---- reminders ------------------------------------------------------------
  const addReminder = useCallback<PlannerValue["addReminder"]>(({ deliveryId, customerName, at, label, kind }) => {
    setStore((s) => ({
      ...s,
      reminders: [
        ...s.reminders,
        { id: `${kind}:${deliveryId}:${at.getTime()}`, deliveryId, customerName, kind, at: at.toISOString(), label },
      ],
    }));
  }, []);

  const completeReminder = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      reminders: s.reminders.map((r) => (r.id === id ? { ...r, doneAt: new Date().toISOString() } : r)),
    }));
  }, []);

  const snoozeReminder = useCallback((id: string, minutes: number) => {
    setStore((s) => ({
      ...s,
      reminders: s.reminders.map((r) =>
        r.id === id ? { ...r, at: new Date(Date.now() + minutes * 60_000).toISOString(), firedAt: undefined } : r
      ),
    }));
  }, []);

  // Schedules coming from the server (company / customer requested a new slot)
  // get a reminder automatically, so the driver never has to remember them.
  useEffect(() => {
    const additions: Reminder[] = [];
    for (const d of deliveries) {
      const at = scheduledMs(d);
      if (at === null || d.status === "delivered" || at < Date.now() - 60 * 60_000) continue;
      const id = `reschedule:${d.id}:${at}`;
      if (store.reminders.some((r) => r.id === id)) continue;
      const ringAt = Math.max(Date.now() + 5_000, at - DEFAULT_REMIND_BEFORE_MIN * 60_000);
      additions.push({
        id,
        deliveryId: d.id,
        customerName: d.customerName,
        kind: "reschedule",
        at: new Date(ringAt).toISOString(),
        label: `Livraison reportée à ${hhmm(at)}`,
      });
    }
    if (additions.length) setStore((s) => ({ ...s, reminders: [...s.reminders, ...additions] }));
  }, [deliveries, store.reminders]);

  // Close reminders of deliveries that are already delivered.
  useEffect(() => {
    const deliveredIds = new Set(deliveries.filter((d) => d.status === "delivered").map((d) => d.id));
    if (!store.reminders.some((r) => !r.doneAt && deliveredIds.has(r.deliveryId))) return;
    setStore((s) => ({
      ...s,
      reminders: s.reminders.map((r) => (!r.doneAt && deliveredIds.has(r.deliveryId) ? { ...r, doneAt: new Date().toISOString() } : r)),
    }));
  }, [deliveries, store.reminders]);

  // Reminder clock: every 15 s, ring whatever is due.
  const remindersRef = useRef(store.reminders);
  remindersRef.current = store.reminders;
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const due = remindersRef.current.filter((r) => !r.doneAt && !r.firedAt && Date.parse(r.at) <= now);
      if (!due.length) return;
      due.forEach((r) => {
        alertUser({
          title: r.kind === "callback" ? `Rappeler ${r.customerName}` : `Livraison ${r.customerName}`,
          body: r.label,
          tag: r.id,
          onClick: () => window.location.assign(`/deliveries/${encodeURIComponent(r.deliveryId)}`),
        });
      });
      const ids = new Set(due.map((r) => r.id));
      const stamp = new Date().toISOString();
      setStore((s) => ({ ...s, reminders: s.reminders.map((r) => (ids.has(r.id) ? { ...r, firedAt: stamp } : r)) }));
    };
    check();
    const t = setInterval(check, 15_000);
    return () => clearInterval(t);
  }, []);

  const [permission, setPermission] = useState<NotifPermission>(notificationPermission());
  const enableNotifications = useCallback(async () => {
    const p = await requestNotificationPermission();
    setPermission(p);
    showToast(
      p === "granted" ? "Notifications activées" : "Notifications non autorisées — les rappels s'afficheront dans l'app.",
      p === "granted" ? "success" : "warning"
    );
  }, [showToast]);

  // ---- reschedule -----------------------------------------------------------
  const reschedule = useCallback<PlannerValue["reschedule"]>(
    async (delivery, req) => {
      const iso = req.scheduledFor.toISOString();
      const prev = store.schedules[delivery.id];
      const count = (prev?.count ?? delivery.rescheduleCount ?? 0) + 1;
      const ringAt = new Date(Math.max(Date.now() + 5_000, req.scheduledFor.getTime() - req.remindBeforeMin * 60_000));

      // 1. local first: instant, works offline
      setStore((s) => ({
        ...s,
        schedules: { ...s.schedules, [delivery.id]: { scheduledFor: iso, reason: req.reason, count, synced: false, note: req.note } },
        reminders: [
          // old slot's reminders are obsolete
          ...s.reminders.map((r) => (r.deliveryId === delivery.id && r.kind === "reschedule" && !r.doneAt ? { ...r, doneAt: new Date().toISOString() } : r)),
          {
            id: `reschedule:${delivery.id}:${req.scheduledFor.getTime()}`,
            deliveryId: delivery.id,
            customerName: delivery.customerName,
            kind: "reschedule",
            at: ringAt.toISOString(),
            label: `Livraison reportée à ${hhmm(req.scheduledFor.getTime())}${req.remindBeforeMin ? ` (dans ${req.remindBeforeMin} min)` : ""}`,
          },
        ],
      }));

      // 2. then tell the backend
      try {
        const updated = await deliveriesApi.reschedule(delivery.id, { scheduledFor: iso, reason: req.reason, note: req.note });
        updateDelivery({ ...updated, scheduledFor: updated.scheduledFor ?? iso, rescheduleCount: updated.rescheduleCount ?? count });
        setStore((s) => ({ ...s, schedules: { ...s.schedules, [delivery.id]: { ...s.schedules[delivery.id], synced: true } } }));
        return { synced: true };
      } catch {
        return { synced: false };
      }
    },
    [store.schedules, updateDelivery]
  );

  // ---- call log -------------------------------------------------------------
  const logCall = useCallback<PlannerValue["logCall"]>(
    async (delivery, req) => {
      const timestamp = new Date().toISOString();
      const id = `local-${delivery.id}-${Date.now()}`;
      setStore((s) => ({
        ...s,
        calls: [...s.calls, { id, deliveryId: delivery.id, timestamp, outcome: req.outcome, phoneUsed: req.phoneUsed, note: req.note, synced: false }].slice(-300),
      }));
      try {
        const updated = await deliveriesApi.logCall(delivery.id, { ...req, timestamp });
        updateDelivery(updated);
        setStore((s) => ({ ...s, calls: s.calls.map((c) => (c.id === id ? { ...c, synced: true } : c)) }));
        return { synced: true };
      } catch {
        return { synced: false };
      }
    },
    [updateDelivery]
  );

  const callsFor = useCallback<PlannerValue["callsFor"]>(
    (delivery) => {
      const local = store.calls.filter((c) => c.deliveryId === delivery.id);
      const all: CallAttempt[] = [...(delivery.callAttempts ?? [])];
      const key = (c: CallAttempt) => `${c.outcome}|${Math.round(Date.parse(c.timestamp) / 10_000)}`;
      const seen = new Set(all.map(key));
      for (const c of local) if (!seen.has(key(c))) all.push(c);
      return all.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    },
    [store.calls]
  );

  // ---- retry whatever failed to sync (network back, app reopened) ----------
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => {
    let running = false;
    const retry = async () => {
      if (running) return;
      running = true;
      try {
        for (const [id, sch] of Object.entries(storeRef.current.schedules)) {
          if (sch.synced) continue;
          try {
            const updated = await deliveriesApi.reschedule(id, { scheduledFor: sch.scheduledFor, reason: sch.reason, note: sch.note });
            updateDelivery({ ...updated, scheduledFor: updated.scheduledFor ?? sch.scheduledFor });
            setStore((s) => ({ ...s, schedules: { ...s.schedules, [id]: { ...s.schedules[id], synced: true } } }));
          } catch {
            /* still offline / endpoint missing: keep local copy */
          }
        }
        for (const c of storeRef.current.calls) {
          if (c.synced) continue;
          try {
            const updated = await deliveriesApi.logCall(c.deliveryId, {
              outcome: c.outcome,
              phoneUsed: c.phoneUsed ?? "primary",
              note: c.note,
              timestamp: c.timestamp,
            });
            updateDelivery(updated);
            setStore((s) => ({ ...s, calls: s.calls.map((x) => (x.id === c.id ? { ...x, synced: true } : x)) }));
          } catch {
            break; // don't hammer a failing endpoint
          }
        }
      } finally {
        running = false;
      }
    };
    const t = setInterval(retry, 60_000);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", retry);
    };
  }, [updateDelivery]);

  // ---- derived reminder lists ------------------------------------------------
  const openReminders = useMemo(
    () => store.reminders.filter((r) => !r.doneAt).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    [store.reminders]
  );
  const ringingReminders = useMemo(() => openReminders.filter((r) => r.firedAt), [openReminders]);

  const value: PlannerValue = {
    deliveries,
    plan,
    suggestions,
    driverLocation,
    locationError,
    geocodingPending: geoPending,
    reminders: store.reminders,
    openReminders,
    ringingReminders,
    addReminder,
    completeReminder,
    snoozeReminder,
    notificationPermission: permission,
    enableNotifications,
    reschedule,
    logCall,
    callsFor,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlanner() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlanner must be used within DriverPlannerProvider");
  return ctx;
}

function hhmm(ms: number) {
  return new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
