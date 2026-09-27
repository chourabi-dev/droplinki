import { Contact, Mail, Phone, MapPin, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClientAuth } from "@/context/ClientAuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clientFullName } from "@/types";

export default function ClientProfile() {
  const { client, logout } = useClientAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Profil</h1>
      <p className="mt-1 text-ink-500">Les informations de votre compte expéditeur.</p>

      <Card className="mt-6">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Contact className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">{client ? clientFullName(client) : ""}</p>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-go-50 px-2 py-0.5 text-xs font-semibold text-go-600">
                <ShieldCheck className="h-3 w-3" /> Compte expéditeur
              </span>
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-ink-400" />
              <dd className="text-ink-900">{client?.email}</dd>
            </div>
            {client?.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-ink-400" />
                <dd className="text-ink-900">{client.phone}</dd>
              </div>
            )}
            {client?.address && (
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 text-ink-400" />
                <dd className="text-ink-900">{client.address}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <h2 className="font-display font-semibold text-ink-900">Session</h2>
          <p className="mt-1 text-sm text-ink-500">Votre compte est créé et géré par l'entreprise avec laquelle vous travaillez.</p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => {
              logout();
              navigate("/client/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
