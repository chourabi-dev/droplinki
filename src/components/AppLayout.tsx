import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppHeader } from "./AppHeader";
import { MobileTabBar } from "./MobileTabBar";
import { DemoBanner } from "./DemoBanner";

export function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <DemoBanner />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
