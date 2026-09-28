import { useParams } from "react-router-dom";
import { Undo2 } from "lucide-react";
import { ScannerStation } from "@/components/company/ScannerStation";

/**
 * Unauthenticated station screen — "Retours". Reachable at
 * /company/:companyId/station/returns with no login: it's meant to run on a
 * fixed device where abandoned / returned packages are dropped off, plugged
 * to a laser scanner.
 */
export default function CompanyStationReturns() {
  const { companyId } = useParams<{ companyId: string }>();
  if (!companyId) return null;
  return <ScannerStation companyId={companyId} station="returns" icon={Undo2} accent="warn" />;
}
