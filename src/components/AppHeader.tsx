import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, Package, User, LogOut, Menu, X, Map as MapIcon, Route as RouteIcon, Bell } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePlanner } from "@/context/DriverPlannerContext";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import cebs from "@/assets/cebs-dark.png";



const NAV_ITEMS = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutGrid },
  { to: "/route", label: "Tournée", icon: RouteIcon },
  { to: "/deliveries", label: "Livraisons", icon: Package },
  { to: "/map", label: "Carte", icon: MapIcon },
  { to: "/profile", label: "Profil", icon: User },
];

export function AppHeader() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { ringingReminders } = usePlanner();
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
          <BellLink count={ringingReminders.length} />
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-900"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
           
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <BellLink count={ringingReminders.length} />
          <button className="p-2" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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

function BellLink({ count }: { count: number }) {
  return (
    <NavLink to="/reminders" className="relative rounded-xl p-2 text-ink-600 hover:bg-ink-50" aria-label="Rappels">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warn-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </NavLink>
  );
}
