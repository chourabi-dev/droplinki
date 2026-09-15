import { Navigate, Outlet } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { AppHeader } from "./AppHeader";
import { MobileTabBar } from "./MobileTabBar";


export function AppLayout() {
  const { isAuthenticated, isLoading, authCheckError, retryAuthCheck } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      </div>
    );
  }

  // A token exists locally but we could not confirm it with the backend
  // (network error / CORS / 5xx) — this is different from "not logged in",
  // so we show a retry screen instead of silently bouncing to /login.
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
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
