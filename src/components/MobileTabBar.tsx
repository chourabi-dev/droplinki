import { NavLink } from "react-router-dom";
import { LayoutGrid, Package, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
        <TabLink to="/dashboard" icon={LayoutGrid} label="Accueil" />
        <TabLink to="/deliveries" icon={Package} label="Livraisons" />
        <NavLink
          to="/create-delivery"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </NavLink>
        <TabLink to="/profile" icon={User} label="Profil" />
        <div className="w-8" />
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
