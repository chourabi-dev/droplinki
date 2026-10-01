import { useParams } from "react-router-dom";
import { ReturnCheckStation } from "@/components/company/ReturnCheckStation";

/**
 * Unauthenticated station screen — "Contrôle des retours". Reachable at
 * /company/:companyId/station/return-check with no login: it runs on a fixed
 * device plugged to a laser scanner. Scan a package, read its history, then
 * decide: return it to the sender or send it out again.
 */
export default function CompanyStationReturnCheck() {
  const { companyId } = useParams<{ companyId: string }>();
  if (!companyId) return null;
  return <ReturnCheckStation companyId={companyId} />;
}
