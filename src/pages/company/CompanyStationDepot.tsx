import { useParams } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { ScannerStation } from "@/components/company/ScannerStation";

/**
 * Unauthenticated station screen — "Colis en dépôt". Reachable at
 * /company/:companyId/station/depot with no login: it's meant to run on a
 * fixed device at the warehouse entrance, plugged to a laser scanner.
 */
export default function CompanyStationDepot() {
  const { companyId } = useParams<{ companyId: string }>();
  if (!companyId) return null;
  return <ScannerStation companyId={companyId} station="depot" icon={PackageCheck} accent="brand" />;
}
