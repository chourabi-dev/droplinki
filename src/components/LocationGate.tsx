import React from "react";
import { Loader2, LogOut, MapPin, MapPinOff, SatelliteDish, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import { useLocationReporter } from "@/hooks/useLocationReporter";
import logo from "@/assets/logo.png";

/**
 * Blocks the whole driver app until the driver is sharing their location, and
 * — once they are — reports it to the server (open / return / every minute).
 * Sits inside AppLayout, so it only ever applies to a signed-in driver.
 */
export function LocationGate({ children }: { children: React.ReactNode }) {
  const { access, retry, reportDenied } = useLocationPermission();

  if (access !== "granted") return <BlockedScreen access={access} onRetry={retry} />;

  return <Reporting onDenied={reportDenied}>{children}</Reporting>;
}

function Reporting({ children, onDenied }: { children: React.ReactNode; onDenied: () => void }) {
  const { driver } = useAuth();
  useLocationReporter({ driverKey: driver?.id ?? driver?.email ?? "me", onPermissionDenied: onDenied });
  return <>{children}</>;
}

function BlockedScreen({ access, onRetry }: { access: Exclude<ReturnType<typeof useLocationPermission>["access"], "granted">; onRetry: () => void }) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 py-10">
      <img src={logo} width={140} alt="DropLink" className="mb-8" />

      <div className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-7 text-center shadow-card" role="alertdialog" aria-labelledby="loc-title">
        {access === "checking" && (
          <>
            <Icon tone="brand">
              <Loader2 className="h-6 w-6 animate-spin" />
            </Icon>
            <h1 id="loc-title" className="font-display text-xl font-bold text-ink-950">
              Vérification de votre position…
            </h1>
            <p className="mt-2 text-sm text-ink-500">Si votre navigateur vous le demande, choisissez « Autoriser ».</p>
          </>
        )}

        {access === "prompt" && (
          <>
            <Icon tone="brand">
              <MapPin className="h-6 w-6" />
            </Icon>
            <h1 id="loc-title" className="font-display text-xl font-bold text-ink-950">
              Activez votre localisation
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              DropLink partage votre position avec votre entreprise pendant que vous utilisez l'application. Elle est obligatoire pour accéder à vos livraisons.
            </p>
            <Button fullWidth className="mt-6" onClick={onRetry}>
              <MapPin className="h-4 w-4" /> Activer ma position
            </Button>
          </>
        )}

        {access === "denied" && (
          <>
            <Icon tone="red">
              <MapPinOff className="h-6 w-6" />
            </Icon>
            <h1 id="loc-title" className="font-display text-xl font-bold text-ink-950">
              La localisation est bloquée
            </h1>
            <p className="mt-2 text-sm text-ink-500">Vous ne pouvez pas utiliser DropLink sans partager votre position. Autorisez-la dans les réglages de votre navigateur :</p>
            <ol className="mt-4 space-y-2 rounded-xl bg-ink-50 p-4 text-left text-sm text-ink-700">
              <li>1. Touchez le cadenas (ou l'icône de réglages) à gauche de l'adresse du site.</li>
              <li>2. Ouvrez « Autorisations » puis « Localisation ».</li>
              <li>3. Choisissez « Autoriser », puis revenez ici.</li>
            </ol>
            <p className="mt-3 text-xs text-ink-500">Sur iPhone : Réglages › Confidentialité › Service de localisation › Safari.</p>
            <Button fullWidth className="mt-5" onClick={onRetry}>
              J'ai autorisé, réessayer
            </Button>
          </>
        )}

        {access === "error" && (
          <>
            <Icon tone="warn">
              <SatelliteDish className="h-6 w-6" />
            </Icon>
            <h1 id="loc-title" className="font-display text-xl font-bold text-ink-950">
              Position introuvable
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              L'autorisation est accordée, mais votre appareil n'a pas pu donner sa position. Vérifiez que le GPS est activé et que vous avez du signal, puis réessayez.
            </p>
            <Button fullWidth className="mt-6" onClick={onRetry}>
              Réessayer
            </Button>
          </>
        )}

        {access === "unavailable" && (
          <>
            <Icon tone="red">
              <ShieldAlert className="h-6 w-6" />
            </Icon>
            <h1 id="loc-title" className="font-display text-xl font-bold text-ink-950">
              Localisation indisponible
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              Ce navigateur ne permet pas d'accéder à la position (la page doit être ouverte en HTTPS dans un navigateur récent). Ouvrez DropLink avec Chrome ou Safari.
            </p>
            <Button fullWidth variant="outline" className="mt-6" onClick={onRetry}>
              Réessayer
            </Button>
          </>
        )}
      </div>

      <button onClick={logout} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <LogOut className="h-4 w-4" /> Se déconnecter
      </button>
    </div>
  );
}

function Icon({ tone, children }: { tone: "brand" | "red" | "warn"; children: React.ReactNode }) {
  const tones = { brand: "bg-brand-50 text-brand-600", red: "bg-red-50 text-red-600", warn: "bg-warn-50 text-warn-600" };
  return <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${tones[tone]}`}>{children}</div>;
}
