import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Governorate, Delegation } from "@/types";
import { companyGeoApi, ApiError, isNetworkError } from "@/lib/companyApi";
import { useCompanyAuth } from "@/context/CompanyAuthContext";

interface CompanyGeoContextValue {
  governorates: Governorate[];
  governoratesLoading: boolean;
  governoratesError: string | null;
  refreshGovernorates: () => Promise<void>;

  /** Cached delegations for a governorate, or undefined if never fetched. */
  getDelegations: (governorateId: string) => Delegation[] | undefined;
  isLoadingDelegations: (governorateId: string) => boolean;
  getDelegationsError: (governorateId: string) => string | null;
  /** Fetches (and caches) delegations for a governorate. Safe to call repeatedly. */
  ensureDelegations: (governorateId: string) => Promise<Delegation[]>;
}

const CompanyGeoContext = createContext<CompanyGeoContextValue | undefined>(undefined);

export function CompanyGeoProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useCompanyAuth();
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [governoratesLoading, setGovernoratesLoading] = useState(false);
  const [governoratesError, setGovernoratesError] = useState<string | null>(null);

  const [delegationsCache, setDelegationsCache] = useState<Record<string, Delegation[]>>({});
  const [delegationsLoading, setDelegationsLoading] = useState<Record<string, boolean>>({});
  const [delegationsErrors, setDelegationsErrors] = useState<Record<string, string | null>>({});

  const refreshGovernorates = useCallback(async () => {
    setGovernoratesLoading(true);
    setGovernoratesError(null);
    try {
      const data = await companyGeoApi.governorates();
      setGovernorates(data);
    } catch (err) {
      setGovernoratesError(companyGeoErrorMessage(err));
    } finally {
      setGovernoratesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refreshGovernorates();
    else {
      setGovernorates([]);
      setDelegationsCache({});
    }
  }, [isAuthenticated, refreshGovernorates]);

  const ensureDelegations = useCallback(
    async (governorateId: string) => {
      if (delegationsCache[governorateId]) return delegationsCache[governorateId];
      setDelegationsLoading((prev) => ({ ...prev, [governorateId]: true }));
      setDelegationsErrors((prev) => ({ ...prev, [governorateId]: null }));
      try {
        const data = await companyGeoApi.delegations(governorateId);
        setDelegationsCache((prev) => ({ ...prev, [governorateId]: data }));
        return data;
      } catch (err) {
        const message = companyGeoErrorMessage(err);
        setDelegationsErrors((prev) => ({ ...prev, [governorateId]: message }));
        throw err;
      } finally {
        setDelegationsLoading((prev) => ({ ...prev, [governorateId]: false }));
      }
    },
    [delegationsCache]
  );

  const getDelegations = useCallback((governorateId: string) => delegationsCache[governorateId], [delegationsCache]);
  const isLoadingDelegations = useCallback((governorateId: string) => !!delegationsLoading[governorateId], [delegationsLoading]);
  const getDelegationsError = useCallback((governorateId: string) => delegationsErrors[governorateId] ?? null, [delegationsErrors]);

  const value = useMemo(
    () => ({
      governorates,
      governoratesLoading,
      governoratesError,
      refreshGovernorates,
      getDelegations,
      isLoadingDelegations,
      getDelegationsError,
      ensureDelegations,
    }),
    [governorates, governoratesLoading, governoratesError, refreshGovernorates, getDelegations, isLoadingDelegations, getDelegationsError, ensureDelegations]
  );

  return <CompanyGeoContext.Provider value={value}>{children}</CompanyGeoContext.Provider>;
}

export function useCompanyGeo() {
  const ctx = useContext(CompanyGeoContext);
  if (!ctx) throw new Error("useCompanyGeo must be used within CompanyGeoProvider");
  return ctx;
}

export function companyGeoErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
