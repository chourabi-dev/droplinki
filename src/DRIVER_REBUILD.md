# Driver app rebuild — notes

Drivers no longer create deliveries. Companies create + assign them; the driver
app plans the day, calls customers, handles reschedules and reminders.

## What changed
- Removed: `pages/CreateDelivery.tsx`, `/create-delivery` route, the "+" tab, `deliveriesApi.create`.
- New: `lib/routing.ts` (planner), `lib/geocode.ts`, `lib/phone.ts`, `lib/notify.ts`, `lib/ics.ts`,
  `context/DriverPlannerContext.tsx`, `components/{CallAssistant,RescheduleSheet,ReminderBanner,RouteMap,PrecisionBadge}.tsx`,
  `components/ui/BottomSheet.tsx`, `hooks/useDeliveryActions.tsx`, `pages/{Route,Reminders}.tsx`.
- Rewritten: Dashboard, Deliveries, DeliveryDetails, DeliveriesMap, DeliveryCard, StatusBadge, MobileTabBar, AppHeader/AppLayout.
- `DeliveryContext`: Pusher subscription now waits for the driver (it used `[]` deps and never subscribed) and cleans up.

## Planning rules (lib/routing.ts)
- In the route: every non-delivered delivery except EN-ATT / EN-DEP (not on the truck yet).
- First stop = nearest to the driver; the rest is ordered nearest-neighbour then 2-opt.
- No lat/lng -> geocoded address (Nominatim, cached) -> delegation/governorate centroid -> "position inconnue"
  (slotted next to stops of the same delegation, otherwise grouped last).
- `scheduledFor` later than today -> parked; later today -> hidden until 20 min before; reached -> "due" (priority).
- Order only re-computes when the driver moves > 150 m, so the list doesn't jump around.

## Dial flow (CallAssistant)
Primary number (`customerPhone`) is always dialled first via `tel:`. `customerEmmergencyPhone` is optional and only
shown if present, dialable and different from the primary. Returning to the app opens the outcome step.
Outcomes map to `CallOutcome` (+ new `reschedule_requested`).

## Backend contract added (please implement)
- `POST /api/deliveries/:id/call`        body `{ outcome, phoneUsed: "primary"|"secondary", note?, timestamp? }` -> Delivery (with `callAttempts`)
- `POST /api/deliveries/:id/reschedule`  body `{ scheduledFor: ISO, reason, note? }` -> Delivery (with `scheduledFor`, `rescheduleCount`)
- `Delivery` gains optional: `scheduledFor`, `rescheduleReason`, `rescheduleCount`, `callAttempts`; `customerEmmergencyPhone` is optional.
Until these exist the app keeps everything locally (localStorage, per driver) and retries every minute / on reconnect.

## Reminders
Fire while the app is open (banner + system notification + vibration + beep). For "app closed", the reschedule flow
offers a calendar (.ics) alarm. True background push would need Web Push from the backend.
