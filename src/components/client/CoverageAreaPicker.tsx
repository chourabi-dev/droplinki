import { Governorate, Delegation } from "@/types";

/**
 * Two cascading <select> fields for the recipient's governorate + delegation,
 * restricted to the shipping company's coverage area (`Client.company.
 * availableGovernorates` / `availableDelegations`, from `GET /api/client/me`).
 * Unlike the company-side GovernorateDelegationPicker, there is nothing to
 * fetch here — the whole list is already embedded on the client account.
 */
export function CoverageAreaPicker({
  governorates,
  delegations,
  governorateId,
  delegationId,
  onGovernorateChange,
  onDelegationChange,
  required,
}: {
  governorates: Governorate[];
  delegations: Delegation[];
  governorateId: string;
  delegationId: string;
  onGovernorateChange: (id: string) => void;
  onDelegationChange: (id: string) => void;
  required?: boolean;
}) {

 
  

  const delegationsForGovernorate = governorateId != null ? delegations.filter((d) => d.governorateId == governorateId) : [];





  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-ink-700">
          Gouvernorat {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={governorateId}
          onChange={(e) => {
            onGovernorateChange(e.target.value);
            onDelegationChange("");
          }}
          required={required}
          className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
        >
          <option value="">Sélectionner un gouvernorat</option>
          {governorates.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-ink-700">
          Délégation {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={delegationId}
          disabled={!governorateId}
          onChange={(e) => onDelegationChange(e.target.value)}
          required={required}
          className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
        >
          <option value="">{!governorateId ? "Choisir un gouvernorat d'abord" : "Sélectionner une délégation"}</option>
          {delegationsForGovernorate.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {governorateId && delegationsForGovernorate.length === 0 && (
          <p className="mt-1.5 text-xs text-ink-500">Aucune délégation couverte par votre société de livraison dans ce gouvernorat.</p>
        )}
      </div>
    </div>
  );
}
