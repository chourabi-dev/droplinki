import { ClientDelivery, PayoutLine } from "@/types";

export interface PayoutTotals {
  deliveredCount: number;
  /** Sum of the cash collected on delivered packages = what the company pays the client. */
  total: number;
}

/** Rounds to millimes (Tunisian dinar has 3 decimals) to avoid float drift. */
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Pure payout math. A payout only covers delivered packages: canceled ones
 * are handled by the "Retours clients" flow (see lib/returns.ts).
 * Example: 2 delivered packages worth 30 DT and 30 DT → total 60 DT.
 */
export function computePayout(lines: PayoutLine[]): PayoutTotals {
  const delivered = lines.filter((l) => l.kind === "delivered");
  return {
    deliveredCount: delivered.length,
    total: round3(delivered.reduce((sum, l) => sum + (l.amount || 0), 0)),
  };
}

/**
 * A delivery counts as "money the client is still expecting from the delivery
 * company" when it is delivered-and-paid ("delivered-payed": the cash was
 * collected from the recipient) and has not been covered by a validated
 * payout yet (no `paidAt` / `payoutId`).
 */
export function isAwaitingPayout(d: Pick<ClientDelivery, "status" | "paidAt" | "payoutId">): boolean {
  return d.status === "delivered-payed" && !d.paidAt && !d.payoutId;
}

export interface ExpectedCollection {
  count: number;
  /** Sum of the cash collected on those packages (delivery fees excluded) — what the company still owes the client. */
  total: number;
  deliveries: ClientDelivery[];
}

export function computeExpectedCollection(deliveries: ClientDelivery[]): ExpectedCollection {
  const awaiting = deliveries.filter(isAwaitingPayout);
  return {
    count: awaiting.length,
    total: round3(awaiting.reduce((sum, d) => sum + (d.amount || 0), 0)),
    deliveries: awaiting,
  };
}
