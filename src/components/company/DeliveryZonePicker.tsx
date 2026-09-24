import { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { GovernorateDelegationPicker } from "@/components/company/GovernorateDelegationPicker";
import { useCompanyDeliveryZones } from "@/context/CompanyDeliveryZoneContext";

/**
 * Lets a company staff member pick the delivery zones a driver covers.
 * Zones are filtered progressively: choose a governorate, then a delegation,
 * then check off the (already-created) zones that belong to it. Picks from
 * different delegations accumulate as chips, so a driver can cover zones
 * spread across several delegations/governorates.
 */
export function DeliveryZonePicker({
  selectedZoneIds,
  onChange,
}: {
  selectedZoneIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { zones, isLoading, zonesForDelegation } = useCompanyDeliveryZones();
  const [governorateId, setGovernorateId] = useState<string | null>(null);
  const [delegationId, setDelegationId] = useState<string | null>(null);

  const candidateZones = delegationId ? zonesForDelegation(delegationId).filter((z) => z.isActive) : [];
  const selectedZones = zones.filter((z) => selectedZoneIds.includes(z.id));

  function toggleZone(id: string) {
    onChange(selectedZoneIds.includes(id) ? selectedZoneIds.filter((z) => z != id) : [...selectedZoneIds, id]);
  }

  function removeZone(id: string) {
    onChange(selectedZoneIds.filter((z) => z !== id));
  }

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-ink-700">Zones de livraison</label>
      <p className="mb-3 text-xs text-ink-500">
        Filtrez par gouvernorat puis délégation pour retrouver les zones à assigner à ce livreur.
      </p>

      <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
        <GovernorateDelegationPicker
          governorateId={governorateId}
          delegationId={delegationId}
          onGovernorateChange={setGovernorateId}
          onDelegationChange={setDelegationId}
        />

        <div className="mt-4">
          {!delegationId ? (
            <p className="text-sm text-ink-400">Sélectionnez une délégation pour voir ses zones de livraison.</p>
          ) : isLoading ? (
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des zones...
            </div>
          ) : candidateZones.length === 0 ? (
            <p className="text-sm text-ink-400">Aucune zone de livraison active pour cette délégation.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {candidateZones.map((z) => (
                <label
                  key={z.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:border-brand-300"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    checked={selectedZoneIds.includes(z.id)}
                    onChange={() => toggleZone(z.id)}
                  />
                  <span className="text-ink-800">{z.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedZones.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedZones.map((z) => (
            <span
              key={z.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
            >
              <MapPin className="h-3 w-3" /> {z.name}
              <button type="button" onClick={() => removeZone(z.id)} className="text-brand-500 hover:text-brand-800" aria-label={`Retirer ${z.name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
