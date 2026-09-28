import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, PackageSearch, Warehouse } from "lucide-react";
import logo from "@/assets/logo.png";
import cebs from "@/assets/cebs-dark.png";

interface BoardTab {
  key: string;
  label: string;
  to: string;
}

/**
 * Shared chrome for the three no-auth warehouse board screens
 * (src/pages/company/public/*). These are meant to be left open on a
 * warehouse/kiosk device — no login, scoped only by the `companyId` in the
 * URL — so this shell intentionally doesn't reuse CompanyLayout (which
 * requires an authenticated session and its own sidebar navigation).
 */
export function WarehouseBoardLayout({
  companyId,
  activeTab,
  title,
  subtitle,
  count,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyLabel,
  children,
}: {
  companyId: string;
  activeTab: string;
  title: string;
  subtitle: string;
  count?: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyLabel: string;
  children: ReactNode;
}) {
  const tabs: BoardTab[] = [
    { key: "depot", label: "Colis en dépôt", to: `/company/${companyId}/public/depot` },
    { key: "chargement", label: "Chargement camion", to: `/company/${companyId}/public/chargement` },
    { key: "retours", label: "Retours", to: `/company/${companyId}/public/retours` },
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img src={logo} width={150} alt="DropLink" />
              <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 sm:inline-flex">
                Entrepôt
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              <Warehouse className="h-3.5 w-3.5" />
              <span>Entreprise {companyId}</span>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto dl-scroll">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                to={tab.to}
                className={
                  "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors " +
                  (tab.key === activeTab
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200")
                }
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-ink-500">
            {subtitle}
            {count !== undefined && !isLoading && !error ? ` · ${count} colis` : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
            <p className="font-display font-semibold text-ink-900">Impossible de charger les colis</p>
            <p className="mt-1 max-w-sm text-sm text-ink-500">{error}</p>
            <button
              onClick={onRetry}
              className="mt-4 rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-950"
            >
              Réessayer
            </button>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
              <PackageSearch className="h-6 w-6" />
            </div>
            <p className="font-display font-semibold text-ink-900">{emptyLabel}</p>
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="pb-8 pt-2 text-center">
        <p className="text-xs text-ink-400">All rights reserved | PowredBy</p>
        <a href="https://www.chourabi-e-business-solutions.com/" target="_blank" rel="noreferrer" className="mt-1 inline-block">
          <img src={cebs} width={90} alt="CEBS" />
        </a>
      </footer>
    </div>
  );
}
