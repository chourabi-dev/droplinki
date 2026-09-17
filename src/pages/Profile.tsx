import { useState } from "react";
import {
  User,
  Phone,
  Mail,
  BadgeCheck,
  MailCheck,
  Loader2,
} from "lucide-react";

import { useAuth, authErrorMessage } from "@/context/AuthContext";
import { useDeliveries } from "@/context/DeliveryContext";
import { useToast } from "@/context/ToastContext";

export default function Profile() {
  const { driver } = useAuth();
  const { deliveries } = useDeliveries();
  const { showToast } = useToast();

  const [sendingVerification, setSendingVerification] = useState(false);

  if (!driver) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const emailVerified = driver.emailVerified === true;

  
  async function handleSendVerificationEmail() {
    setSendingVerification(true);

    try {
      const token = localStorage.getItem("droplink:token");

      const response = await fetch(
        `https://droplinki-backend.chourabi-e-business-solutions.com/api/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Impossible d'envoyer l'email de vérification."
        );
      }

      showToast(
        "Un email de vérification vient de vous être envoyé.",
        "success"
      );
    } catch (err) {
      showToast(authErrorMessage(err), "warning");
    } finally {
      setSendingVerification(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
        Profil
      </h1>

      <p className="mt-1 text-ink-500">
        Gérez vos informations et votre compte.
      </p>

      {/* Profile card */}
      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        {/* User header */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {driver.name
              .split(" ")
              .filter(Boolean)
              .map((name) => name[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>

          {/* Name */}
          <div>
            <p className="font-display text-lg font-semibold text-ink-900">
              {driver.name}
            </p>

            <p className="text-sm text-ink-500">
              Livreur
            </p>
          </div>
        </div>

        {/* Information */}
        <div className="mt-6 space-y-4 border-t border-ink-100 pt-5">
          {/* Name */}
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 shrink-0 text-ink-400" />

            <span className="text-ink-500">
              Nom
            </span>

            <span className="ml-auto font-medium text-ink-900">
              {driver.name}
            </span>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-ink-400" />

            <span className="text-ink-500">
              Téléphone
            </span>

            <span className="ml-auto font-medium text-ink-900">
              {driver.phone || "—"}
            </span>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3 text-sm">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />

            <span className="text-ink-500">
              Email
            </span>

            <div className="ml-auto flex max-w-[75%] flex-col items-end gap-2">
              {/* Email + verification badge */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="break-all text-right font-medium text-ink-900">
                  {driver.email}
                </span>

                {emailVerified ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-go-50 px-2 py-0.5 text-[11px] font-semibold text-go-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Vérifié
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-semibold text-warn-600">
                    <Mail className="h-3 w-3" />
                    Non vérifié
                  </span>
                )}
              </div>

              {/* Resend verification email */}
              {!emailVerified && (
                <button
                  type="button"
                  onClick={handleSendVerificationEmail}
                  disabled={sendingVerification}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingVerification ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <MailCheck className="h-3.5 w-3.5" />
                      Renvoyer l’email de vérification
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Verification warning */}
        {!emailVerified && (
          <div className="mt-6 rounded-xl border border-warn-100 bg-warn-50 p-4">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-warn-600" />

              <div>
                <p className="text-sm font-semibold text-ink-900">
                  Adresse email non vérifiée
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-600">
                  Vérifiez votre adresse email afin de sécuriser votre compte
                  et recevoir les communications importantes de DropLink.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
