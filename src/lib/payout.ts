import { PayoutLine } from "@/types";

export interface PayoutTotals {
  deliveredCount: number;
  returnedCount: number;
  /** Sum of the cash collected on delivered packages. */
  gross: number;
  /** Return fee × number of canceled packages. */
  returnFeesTotal: number;
  /** gross − returnFeesTotal. Negative = the client owes money to the company. */
  net: number;
}

/** Rounds to millimes (Tunisian dinar has 3 decimals) to avoid float drift. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Pure payout math. Example: 2 delivered packages worth 60 DT and 1 canceled
 * package with a 3 DT return fee → gross 60, fees 3, net 57.
 */
export function computePayout(lines: PayoutLine[], returnFee: number): PayoutTotals {
  const delivered = lines.filter((l) => l.kind === "delivered");
  const returned = lines.filter((l) => l.kind === "returned");
  const gross = round3(delivered.reduce((sum, l) => sum + (l.amount || 0), 0));
  const returnFeesTotal = round3(returned.length * (returnFee || 0));
  return {
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    gross,
    returnFeesTotal,
    net: round3(gross - returnFeesTotal),
  };
}
