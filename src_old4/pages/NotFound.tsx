import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <MapPin className="h-7 w-7" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">Page introuvable</h1>
      <p className="mt-1.5 text-ink-500">Cette page n'existe pas.</p>
      <Link to="/" className="mt-6">
        <Button variant="outline">Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
