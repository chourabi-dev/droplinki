import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { WifiOff, LayoutGrid, Package, User, Plus, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useClientAuth } from "@/context/ClientAuthContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const NAV_ITEMS = [
  { to: "/client/dashboard", label: "Tableau de bord", icon: LayoutGrid },
  { to: "/client/deliveries", label: "Livraisons", icon: Package },
  { to: "/client/profile", label: "Profil", icon: User },
];

export function ClientLayout() {
  const { isAuthenticated, isLoading, authCheckError, retryAuthCheck } = useClientAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated && authCheckError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-50 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warn-50 text-warn-500">
          <WifiOff className="h-6 w-6" />
        </div>
        <p className="font-display font-semibold text-ink-900">Impossible de vérifier votre session</p>
        <p className="max-w-sm text-sm text-ink-500">{authCheckError}</p>
        <Button onClick={retryAuthCheck}>Réessayer</Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/client/login" replace />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <ClientHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10">
        <Outlet />
      </main>
      <ClientTabBar />
    </div>
  );
}

function ClientHeader() {
  const navigate = useNavigate();
  const { logout } = useClientAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => navigate("/client/dashboard")} className="flex items-center gap-2">
          <img src={logo} width={150} alt="DropLink" />
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
            Expéditeur
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => {
              logout();
              navigate("/client/login");
            }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-900"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
          <button
            onClick={() => navigate("/client/create-delivery")}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Nouvelle livraison
          </button>
        </div>

        <button className="p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium",
                    isActive ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50"
                  )
                }
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                logout();
                navigate("/client/login");
              }}
              className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-ink-500 hover:bg-ink-50"
            >
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function ClientTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
        <TabLink to="/client/dashboard" icon={LayoutGrid} label="Accueil" />
        <TabLink to="/client/deliveries" icon={Package} label="Livraisons" />
        <NavLink
          to="/client/create-delivery"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </NavLink>
        <TabLink to="/client/profile" icon={User} label="Profil" />
      </div>
    </nav>
  );
}

function TabLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn("flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium", isActive ? "text-brand-600" : "text-ink-500")
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
          {label}
        </>
      )}
    </NavLink>
  );
}
