import { useState } from "react";
import { User, Phone, Mail, Crown, Check, Loader2 } from "lucide-react";
import { useAuth, authErrorMessage } from "@/context/AuthContext";
import { useDeliveries } from "@/context/DeliveryContext";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

const FREE_LIMIT = 5;

export default function Profile() {
  const { driver, upgradeToPro } = useAuth();
  const { deliveries } = useDeliveries();
  const { showToast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  if (!driver) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const now = new Date();
  const usedThisMonth = deliveries.filter((d) => {
    const dt = new Date(d.createdAt);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;

  const usagePct = Math.min(100, Math.round((usedThisMonth / FREE_LIMIT) * 100));

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      await upgradeToPro();
      showToast("Bienvenue dans DropLink Pro 🎉", "success");
    } catch (err) {
      showToast(authErrorMessage(err), "warning");
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Profil</h1>
      <p className="mt-1 text-ink-500">Gérez vos informations et votre abonnement.</p>

      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {driver.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-ink-900">{driver.name}</p>
            <p className="text-sm text-ink-500">Livreur DropLink</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-ink-100 pt-5 text-sm">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-ink-400" />
            <span className="text-ink-500">Nom</span>
            <span className="ml-auto font-medium text-ink-900">{driver.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-ink-400" />
            <span className="text-ink-500">Téléphone</span>
            <span className="ml-auto font-medium text-ink-900">{driver.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-ink-400" />
            <span className="text-ink-500">Email</span>
            <span className="ml-auto font-medium text-ink-900">{driver.email}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Crown className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-display font-semibold text-ink-900">Plan {driver.plan === "pro" ? "Pro" : "Free"}</p>
              <p className="text-xs text-ink-500">{driver.plan === "pro" ? "Livraisons illimitées" : `${FREE_LIMIT} livraisons / mois`}</p>
            </div>
          </div>
          {driver.plan === "pro" && (
            <span className="rounded-full bg-go-50 px-3 py-1 text-xs font-semibold text-go-600">Actif</span>
          )}
        </div>

        {driver.plan === "free" && (
          <>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-ink-500">
                <span>{usedThisMonth} / {FREE_LIMIT} livraisons ce mois-ci</span>
                <span>{usagePct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full ${usagePct >= 100 ? "bg-warn-500" : "bg-brand-600"}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-ink-50 p-4">
              <p className="mb-2 text-sm font-semibold text-ink-900">Avec Pro, débloquez :</p>
              <ul className="space-y-1.5 text-sm text-ink-600">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-go-500" /> Livraisons illimitées</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-go-500" /> Historique complet</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-go-500" /> Statistiques détaillées</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-go-500" /> Support prioritaire</li>
              </ul>
            </div>

            <Button fullWidth className="mt-5" disabled={upgrading} onClick={handleUpgrade}>
              {upgrading ? "Mise à niveau..." : "Passer à Pro"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
