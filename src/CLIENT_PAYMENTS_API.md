# « Paiements & retours » (espace Expéditeur) — backend contract

Frontend: `src/pages/client/ClientPayments.tsx` (route `/client/payments`),
client in `src/lib/clientApi.ts` → `clientPayoutsApi`, `clientReturnsApi`.
Types reused from `src/types.ts`: `ClientPayout`, `ClientReturn`.

Both routes are client-authenticated (Bearer token, like the rest of `/api/client/*`)
and **read-only**. They must only ever return records of the logged-in client.

## Amount to collect (no new route)

Computed in the frontend from `GET /api/client/deliveries`
(`computeExpectedCollection` in `src/lib/payout.ts`):

    sum(amount) of deliveries where status = "delivered-payed" and paidAt / payoutId are empty

So the backend must keep sending `status`, `amount`, and `paidAt` / `payoutId`
(already stamped when the company validates a payout) on each delivery.

## Routes

### `GET /api/client/payouts`

Payments the company already made to the client, newest first (`ClientPayout[]`,
same shape as `GET /api/company/payouts?clientId=…`):

```json
[{ "id": "PY-0001", "clientId": "CL-1042", "createdAt": "2026-10-02T09:30:00Z",
   "deliveredCount": 2, "grossAmount": 60, "netAmount": 60, "deliveryIds": ["EX-1042", "EX-1043"] }]
```

### `GET /api/client/returns`

Canceled packages already handed back to the client, newest first (`ClientReturn[]`,
same shape as `GET /api/company/returns?clientId=…`):

```json
[{ "id": "RT-0001", "clientId": "CL-1042", "createdAt": "2026-10-02T09:30:00Z",
   "returnedCount": 2, "returnFee": 3, "feesTotal": 6, "deliveryIds": ["EX-1042", "EX-1043"] }]
```
