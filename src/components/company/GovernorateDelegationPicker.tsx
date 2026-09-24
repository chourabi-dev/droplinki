import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCompanyGeo } from "@/context/CompanyGeoContext";

/**
 * Two cascading <select> fields: pick a governorate, then pick one of its
 * delegations (fetched lazily and cached in CompanyGeoContext). Selecting a
 * different governorate resets the delegation choice via onDelegationChange(null).
 */
export function GovernorateDelegationPicker({
  governorateId,
  delegationId,
  onGovernorateChange,
  onDelegationChange,
  required,
  disabled,
}: {
  governorateId: string | null;
  delegationId: string | null;
  onGovernorateChange: (id: string | null) => void;
  onDelegationChange: (id: string | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const { governorates, governoratesLoading, governoratesError, ensureDelegations, getDelegations, isLoadingDelegations, getDelegationsError } =
    useCompanyGeo();

  useEffect(() => {
    if (governorateId) ensureDelegations(governorateId).catch(() => {});
  }, [governorateId, ensureDelegations]);

  const delegations = governorateId ? getDelegations(governorateId) : undefined;
  const delegationsLoading = governorateId ? isLoadingDelegations(governorateId) : false;
  const delegationsError = governorateId ? getDelegationsError(governorateId) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-ink-700">
          Gouvernorat {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={governorateId ?? ""}
            disabled={disabled || governoratesLoading}
            onChange={(e) => {
              const value = e.target.value || null;
              onGovernorateChange(value);
              onDelegationChange(null);
            }}
            required={required}
            className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
          >
            <option value="">{governoratesLoading ? "Chargement..." : "Sélectionner un gouvernorat"}</option>
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {governoratesLoading && <Loader2 className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 animate-spin text-ink-400" />}
        </div>
        {governoratesError && <p className="mt-1.5 text-xs text-red-600">{governoratesError}</p>}
      </div>

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-ink-700">
          Délégation {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={delegationId ?? ""}
            disabled={disabled || !governorateId || delegationsLoading}
            onChange={(e) => onDelegationChange(e.target.value || null)}
            required={required}
            className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
          >
            <option value="">
              {!governorateId ? "Choisir un gouvernorat d'abord" : delegationsLoading ? "Chargement..." : "Sélectionner une délégation"}
            </option>
            {delegations?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {delegationsLoading && <Loader2 className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 animate-spin text-ink-400" />}
        </div>
        {delegationsError && <p className="mt-1.5 text-xs text-red-600">{delegationsError}</p>}
      </div>
    </div>
  );
}
