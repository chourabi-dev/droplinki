# Driver movements — backend contract

Powers `/company/drivers/:id/movements` (src/pages/company/CompanyDriverMovements.tsx).

## `GET /api/company/drivers/:id/locations?range=<0|1|7>`

Auth: company bearer token (same as the other `/api/company/*` routes).
Scope: the driver must belong to the authenticated company (404 otherwise).

Response — array of GPS fixes, oldest first (the client re-sorts defensively):

```json
[
  { "latitude": 36.8065, "longitude": 10.1815, "recordedAt": "2026-10-07T08:02:11+01:00", "speedKmh": 31, "accuracy": 12 }
]
```

- `speedKmh` and `accuracy` are optional.
- Also accepted for compatibility: `lat` / `lng` / `lon`, `createdAt` / `timestamp`, `speed`,
  and an `{ "items" | "points" | "data": [...] }` envelope.
- Rows with invalid coordinates or timestamps are dropped by the client.
- `range` is a number of days, not a date: `0` = today, `1` = yesterday, `7` = the last 7 days
  (including today). The server computes the actual dates; it should use the company's time zone
  for "today" / "yesterday" boundaries. Default to `0` when omitted.
- Please cap a response at a few thousand points (downsample server-side if needed).

## `POST /api/driver/locations` (sent by the driver app)

Auth: driver bearer token. The driver is taken from the token; the point is stored against that
driver (and their company) and later served by the `GET` route above.

```json
{ "latitude": 36.8065, "longitude": 10.1815, "recordedAt": "2026-10-07T08:02:11.000Z", "accuracy": 12, "speedKmh": 31 }
```

- `recordedAt` is the device clock (UTC ISO). Points are queued locally while offline and sent
  oldest-first later, so they can arrive late and in bursts — please store `recordedAt`, not the arrival time.
- `accuracy` (meters) and `speedKmh` are optional.
- Response: any 2xx. A 4xx other than 401/408/429 makes the app drop that point; 5xx/401/408/429
  and network errors make it keep the point and retry.
- When it is sent: when the app opens, each time the driver returns to it (tab/app visible again),
  and every 60 s while it stays open and visible. The app is blocked until location access is granted.
