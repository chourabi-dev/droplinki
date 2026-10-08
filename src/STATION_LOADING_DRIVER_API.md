# Loading station — driver badge — backend contract

Powers `/company/:companyId/station/loading` (src/pages/company/CompanyStationLoading.tsx,
src/components/company/ScannerStation.tsx in `requireDriver` mode).

Flow on the screen:
1. Nothing is shown but "Scannez le badge du chauffeur". The first scanned code is treated as a badge.
2. Badge accepted → the driver stays on screen, every following scan is a **package**.
3. The driver lives in React state only: a page refresh forgets it.
4. 15 min without any scan (package or badge) → driver cleared, badge must be scanned again.
5. "Changer de chauffeur" button clears the driver manually.
6. Every scan plays a loud beep immediately (client side); a failed scan adds a low triple buzz.

Both routes are public (no auth), scoped to `companyId`, like the other `/api/open/company/*` station routes.

## NEW — `GET /api/open/company/:companyId/stations/loading/driver/:badge`

`:badge` is the exact string the scanner types when reading the driver badge.
**Decision for the backend team:** what the badge encodes. The simplest option is the driver `id`
(print it as a barcode / QR on the badge). A dedicated `badgeCode` column also works — the client
only sends the raw scanned string and uses the returned `id` afterwards.

200 response (keep it minimal — it is a public route, so no CIN / email / address):

```json
{ "id": "drv_123", "firstName": "Ali", "lastName": "Ben Salah", "phone": "+216 20 123 456", "vehicleType": "camionnette", "plateNumber": "123 TUN 4567" }
```

- `phone`, `vehicleType`, `plateNumber` are optional.
- `404` when the badge is unknown, the driver is not `active`, or the driver belongs to another company.
  The screen then shows "Badge inconnu" and plays the error buzz.

## CHANGED — `POST /api/open/company/:companyId/stations/loading/scan`

Body now carries the driver identified by the badge:

```json
{ "packageId": "PKG-001", "driverId": "drv_123" }
```

- `driverId` is only sent by the loading station (the depot and returns stations still send `{ "packageId" }`).
- Suggested server behaviour: verify the driver belongs to the company, then assign the package to that
  driver while setting its status to loading / `EN-LIV`. Old servers that ignore the field keep working.
