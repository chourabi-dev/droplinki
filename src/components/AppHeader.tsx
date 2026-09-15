import { NavLink, useNavigate } from "react-router-dom";
import { MapPin, LayoutGrid, Package, User, Plus, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import cebs from "@/assets/cebs-dark.png";



const NAV_ITEMS = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutGrid },
  { to: "/deliveries", label: "Livraisons", icon: Package },
  { to: "/profile", label: "Profil", icon: User },
];

export function AppHeader() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
           <img src={ logo } width={150} />
           
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
              navigate("/");
            }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-900"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
          <button
            onClick={() => navigate("/create-delivery")}
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
                navigate("/");
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
