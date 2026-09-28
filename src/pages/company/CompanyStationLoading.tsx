import { useParams } from "react-router-dom";
import { Truck } from "lucide-react";
import { ScannerStation } from "@/components/company/ScannerStation";

/**
 * Unauthenticated station screen — "Chargement du camion". Reachable at
 * /company/:companyId/station/loading with no login: it's meant to run on a
 * fixed device next to the loading dock, plugged to a laser scanner.
 */
export default function CompanyStationLoading() {
  const { companyId } = useParams<{ companyId: string }>();
  if (!companyId) return null;
  return <ScannerStation companyId={companyId} station="loading" icon={Truck} accent="go" />;
}
