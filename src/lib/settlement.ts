import { DriverSettlementLine, SettlementOutcome } from "@/types";

export interface SettlementTotals {
  deliveredCount: number;
  returnedCount: number;
  /** Sum of the cash-on-delivery amounts of the delivered packages. */
  amountTotal: number;
  /** Sum of the delivery fees of the delivered packages. */
  feesTotal: number;
  /** amountTotal + feesTotal — the cash the driver must hand over. */
  cashTotal: number;
}

/** Rounds to millimes (Tunisian dinar has 3 decimals) to avoid float drift. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Amount + fees the driver owes for one package. */
export const lineTotal = (l: Pick<DriverSettlementLine, "amount" | "deliveryFees">) =>
  round3((l.amount || 0) + (l.deliveryFees || 0));

/**
 * Pure settlement math. Example: a driver left with 8 packages, 6 delivered
 * and 2 returned → only the 6 delivered ones count towards the cash to hand
 * over; the 2 returned ones must be brought back to the depot.
 */
export function computeSettlement(
  lines: DriverSettlementLine[],
  outcomes: Record<string, SettlementOutcome>
): SettlementTotals {
  const delivered = lines.filter((l) => outcomes[l.deliveryId] === "delivered");
  const returned = lines.filter((l) => outcomes[l.deliveryId] === "returned");
  const amountTotal = round3(delivered.reduce((s, l) => s + (l.amount || 0), 0));
  const feesTotal = round3(delivered.reduce((s, l) => s + (l.deliveryFees || 0), 0));
  return {
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    amountTotal,
    feesTotal,
    cashTotal: round3(amountTotal + feesTotal),
  };
}

/** Sensible starting point: keep an outcome already recorded, otherwise assume delivered. */
export function defaultOutcomes(lines: DriverSettlementLine[]): Record<string, SettlementOutcome> {
  const out: Record<string, SettlementOutcome> = {};
  for (const l of lines) {
    out[l.deliveryId] = l.status === "EN-DEP-FAILD" || l.status === "CANCELED" ? "returned" : "delivered";
  }
  return out;
}
