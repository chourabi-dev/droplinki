import { Building2, Mail, Phone, LogOut, ShieldCheck, Hash, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompanyAuth } from "@/context/CompanyAuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CompanySettings() {
  const { company, logout } = useCompanyAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Paramètres</h1>
      <p className="mt-1 text-ink-500">Les informations de votre compte entreprise.</p>

      <Card className="mt-6">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">{company?.name}</p>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-go-50 px-2 py-0.5 text-xs font-semibold text-go-600">
                <ShieldCheck className="h-3 w-3" /> Plan Entreprise
              </span>
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-ink-400" />
              <dd className="text-ink-900">{company?.email}</dd>
            </div>
            {company?.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-ink-400" />
                <dd className="text-ink-900">{company.phone}</dd>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Hash className="h-4 w-4 text-ink-400" />
              <div>
                <dt className="text-xs text-ink-500">Matricule fiscale</dt>
                <dd className="text-ink-900">{company?.taxId}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 text-ink-400" />
              <div>
                <dt className="text-xs text-ink-500">Siège social</dt>
                <dd className="text-ink-900">{company?.headOfficeAddress}</dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <h2 className="font-display font-semibold text-ink-900">Session</h2>
          <p className="mt-1 text-sm text-ink-500">Votre session entreprise est indépendante de votre éventuel compte livreur.</p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => {
              logout();
              navigate("/company/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
