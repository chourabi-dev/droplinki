# « Retours clients » — backend contract

Frontend: `src/pages/company/CompanyClientReturns.tsx` (route `/company/client-returns`),
client in `src/lib/companyApi.ts` → `companyReturnsApi`, types in `src/types.ts`
(`ClientReturnLine`, `ClientReturnPreview`, `ClientReturn`).

All routes are company-authenticated (Bearer token), like the rest of `/api/company/*`.

## Why

Payments (`/api/company/payouts/*`) now only deal with **delivered** packages.
Canceled packages are handled here: the company hands them back to the client,
prints a signed return slip and collects the return fees.

## Flow

1. `GET  /api/company/returns/preview?clientId=…` — list the canceled packages to hand back.
2. `POST /api/company/returns/pdf`               — generate the return slip (PDF). **Read-only.**
3. Employee prints the slip, hands the packages over, client signs and pays the fees.
4. `POST /api/company/returns`                   — confirm the handover (writes data).

## Routes

### `GET /api/company/returns/preview?clientId={id}`

`404` if the client doesn't belong to the company. Returns canceled packages of this
client (`status = CANCELED`) that were **not** already handed back:

```json
{
  "client": { "id": "CL-1042", "firstName": "…", "lastName": "…", "phone": "…", "email": "…" },
  "returnFee": 3,
  "lines": [
    {
      "deliveryId": "EX-1042",
      "recipientName": "Ali Ben Salah",
      "designation": "Chaussures",
      "status": "CANCELED",
      "canceledAt": "2026-10-01T10:12:00Z",
      "reason": "Client injoignable"
    }
  ]
}
```

`returnFee` = the company's return fee per package (DT).

### `POST /api/company/returns/pdf`

Body: `{ "clientId": "CL-1042", "deliveryIds": ["EX-1042", "EX-1043"] }`
Response: `200 application/pdf` (the frontend sends `Accept: application/pdf`).
Errors are JSON `{ "message": "…" }` (`404` unknown client / package, `409` package
not CANCELED or already handed back).

Must **not** modify any data (the user may print it several times). Suggested content:

- company header (name, matricule fiscale, address, phone) and generation date/time;
- client block (name, id, phone, taxId);
- table: package id, recipient, designation, cancellation date, return fee;
- totals: number of packages, fee per package, **total fees due by the client**;
- text: "Je soussigné(e) … reconnais avoir reçu les colis listés ci-dessus et avoir réglé les frais de retour";
- signature blocks: *Client* (nom, date, signature) and *Entreprise* (cachet, signature).

### `POST /api/company/returns`

Body: `{ "clientId": "CL-1042", "deliveryIds": ["EX-1042", "EX-1043"] }`

In one transaction: verify every package belongs to the client and is `CANCELED` and not
already handed back, create the return record, stamp the packages (e.g. `returnedAt`,
`returnId`) so they never appear in `preview` again. `409` if any package was already
handed back meanwhile (the frontend then reloads the list). Returns:

```json
{
  "id": "RT-0001",
  "clientId": "CL-1042",
  "createdAt": "2026-10-02T09:30:00Z",
  "returnedCount": 2,
  "returnFee": 3,
  "feesTotal": 6,
  "deliveryIds": ["EX-1042", "EX-1043"]
}
```

### `GET /api/company/returns?clientId={id}`

Past confirmed returns of a client, newest first (`ClientReturn[]`).

### `GET /api/company/returns/{returnId}/pdf`

Same slip as above, for an already confirmed return (reprint from the history list), using
the fee that was applied at confirmation time.

## Payments PDFs (new)

The Payments page also has PDF downloads, same pattern as returns:

- `POST /api/company/payouts/pdf` — body `{ "clientId", "deliveryIds" }` → `application/pdf`.
  Pre-validation **payment statement** (packages, amounts, total to pay). Read-only.
- `GET /api/company/payouts/{payoutId}/pdf` — receipt of a validated payout, for the
  receipt banner and the history rows.

## Payments (changed)

`GET /api/company/payouts/preview` returns **delivered** lines only (`kind: "delivered"`).
`returnFee` in the response and `returnedCount` / `returnFeesTotal` on `ClientPayout`
are now optional/legacy — the frontend ignores them (and ignores any `kind: "returned"` line).
