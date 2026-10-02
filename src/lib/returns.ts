import { round3 } from "@/lib/payout";

/** Return fees the client owes for handing back `count` canceled packages. */
export function computeReturnFees(count: number, returnFee: number): number {
  return round3(count * (returnFee || 0));
}
