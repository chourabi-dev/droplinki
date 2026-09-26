import { useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Package,
  Users,
  Contact,
  UploadCloud,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  WifiOff,
  Building2,
  MapPinned,
} from "lucide-react";
import { useCompanyAuth } from "@/context/CompanyAuthContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const NAV_ITEMS = [
  { to: "/company/dashboard", label: "Tableau de bord", icon: LayoutGrid, end: true },
  { to: "/company/deliveries", label: "Livraisons", icon: Package },
  { to: "/company/drivers", label: "Livreurs", icon: Users },
  { to: "/company/clients", label: "Clients", icon: Contact },
  { to: "/company/delivery-zones", label: "Zones de livraison", icon: MapPinned },
  { to: "/company/stats", label: "Statistiques", icon: BarChart3 },
  { to: "/company/settings", label: "Paramètres", icon: Settings },
];

export function CompanyLayout() {
  const { isAuthenticated, isLoading, authCheckError, retryAuthCheck } = useCompanyAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!isAuthenticated && authCheckError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-950 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warn-500/10 text-warn-500">
          <WifiOff className="h-6 w-6" />
        </div>
        <p className="font-display font-semibold text-white">Impossible de vérifier votre session</p>
        <p className="max-w-sm text-sm text-ink-300">{authCheckError}</p>
        <Button onClick={retryAuthCheck}>Réessayer</Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/company/login" replace />;
  }

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-950 lg:flex">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink-950">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setDrawerOpen(true)} aria-label="Menu" className="rounded-lg p-2 hover:bg-ink-50">
            <Menu className="h-5 w-5 text-ink-900" />
          </button>
          <button onClick={() => navigate("/company/dashboard")} className="flex items-center gap-2">
            <img src={logo} width={130} alt="DropLink" />
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
              Entreprise
            </span>
          </button>
          <button
            onClick={() => navigate("/company/deliveries/new")}
            aria-label="Nouvelle livraison"
            className="rounded-lg bg-brand-600 p-2 text-white"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { company, logout } = useCompanyAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-6">
        <button onClick={() => navigate("/company/dashboard")} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="text-left leading-tight">
            <p className="font-display text-sm font-bold text-white">DropLink</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">Entreprise</p>
          </div>
        </button>
        <button className="p-1 text-ink-300 hover:text-white lg:hidden" onClick={onNavigate} aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5">
        <button
          onClick={() => {
            navigate("/company/deliveries/new");
            onNavigate();
          }}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Nouvelle livraison
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" /> {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-semibold text-white">{company?.name}</p>
        <p className="truncate text-xs text-ink-400">{company?.email}</p>
        <button
          onClick={() => {
            logout();
            navigate("/company/login");
          }}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-300 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" /> Déconnexion
        </button>
      </div>
    </div>
  );
}
