import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Banknote, ChevronDown, Loader2, Package, RefreshCw, Undo2, Wallet } from "lucide-react";
import { useClientDeliveries } from "@/context/ClientDeliveryContext";
import { clientPayoutsApi, clientReturnsApi, ApiError, isNetworkError } from "@/lib/clientApi";
import { computeExpectedCollection } from "@/lib/payout";
import { cn, formatAmount, formatDateTime } from "@/lib/utils";
import { ClientDelivery, ClientPayout, ClientReturn, clientDeliveryRecipientFullName } from "@/types";

type Tab = "payments" | "returns";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}

export default function ClientPayments() {
  const { deliveries, isLoading: deliveriesLoading, error: deliveriesError } = useClientDeliveries();

  const [tab, setTab] = useState<Tab>("payments");
  const [payouts, setPayouts] = useState<ClientPayout[]>([]);
  const [returns, setReturns] = useState<ClientReturn[]>([]);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [returnsError, setReturnsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, r] = await Promise.allSettled([clientPayoutsApi.history(), clientReturnsApi.history()]);
    if (p.status === "fulfilled") {
      setPayouts(p.value);
      setPayoutsError(null);
    } else {
      setPayoutsError(errorMessage(p.reason));
    }
    if (r.status === "fulfilled") {
      setReturns(r.value);
      setReturnsError(null);
    } else {
      setReturnsError(errorMessage(r.reason));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const expected = useMemo(() => computeExpectedCollection(deliveries), [deliveries]);
  const deliveriesById = useMemo(() => new Map(deliveries.map((d) => [d.id, d])), [deliveries]);

  const totalReceived = useMemo(
    () => payouts.reduce((sum, p) => sum + (p.netAmount ?? p.grossAmount ?? 0), 0),
    [payouts]
  );
  const totalReturnedPackages = useMemo(() => returns.reduce((sum, r) => sum + r.returnedCount, 0), [returns]);

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Paiements</h1>
        <p className="mt-1 text-ink-500">
          Suivez l'argent que la société de livraison vous doit et l'historique de vos colis retournés.
        </p>
      </div>

      {/* Expected amount */}
      <div className="rounded-2xl border border-go-500/20 bg-go-50 p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-go-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-600">Colis à encaisser auprès de la société de livraison</p>
            {deliveriesLoading && deliveries.length === 0 ? (
              <Loader2 className="mt-2 h-6 w-6 animate-spin text-go-600" />
            ) : (
              <p className="font-display text-3xl font-bold text-go-600">{expected.deliveries.length}</p>
            )}
            <p className="mt-0.5 text-xs text-ink-500">
              {expected.count} colis livré(s) et payé(s), pas encore versé(s). Frais de livraison non inclus.
            </p>
          </div>
        </div>

        {deliveriesError && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> {deliveriesError}
          </p>
        )}

        {expected.deliveries.length > 0 && (
          <details className="group mt-4 rounded-xl bg-white/70 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-800">
              Voir les colis concernés
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-2 divide-y divide-ink-100 text-sm">
              {expected.deliveries.map((d) => (
                <PackageRow key={d.id} delivery={d} amount={d.amount} />
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Mini stats */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
          <p className="font-display text-2xl font-bold text-ink-950">{formatAmount(totalReceived)}</p>
          <p className="mt-0.5 text-xs text-ink-500">Total déjà reçu ({payouts.length} versement(s))</p>
        </div>
        
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 rounded-xl bg-ink-100 p-1">
        <TabButton active={tab === "payments"} onClick={() => setTab("payments")} icon={Banknote}>
          Historique des paiements
        </TabButton>
         
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : tab === "payments" ? (
          payoutsError ? (
            <ErrorState message={payoutsError} onRetry={load} />
          ) : payouts.length === 0 ? (
            <EmptyState icon={Banknote} title="Aucun paiement pour l'instant" text="Les versements effectués par la société de livraison apparaîtront ici." />
          ) : (
            <ul className="space-y-3">
              {payouts.map((p) => (
                <li key={p.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">{p.id}</p>
                      <p className="text-xs text-ink-500">
                        {formatDateTime(p.createdAt)} · {p.deliveredCount} colis livré(s)
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-go-600">
                      {formatAmount(p.netAmount ?? p.grossAmount)}
                    </p>
                  </div>
                  <PackagesDetails ids={p.deliveryIds} deliveriesById={deliveriesById} showAmount />
                </li>
              ))}
            </ul>
          )
        ) : returnsError ? (
          <ErrorState message={returnsError} onRetry={load} />
        ) : returns.length === 0 ? (
          <EmptyState icon={Undo2} title="Aucun colis retourné pour l'instant" text="Les colis annulés restitués par la société de livraison apparaîtront ici." />
        ) : (
          <ul className="space-y-3">
            {returns.map((r) => (
              <li key={r.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{r.id}</p>
                    <p className="text-xs text-ink-500">
                      {formatDateTime(r.createdAt)} · {r.returnedCount} colis restitué(s)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums text-ink-900">{formatAmount(r.feesTotal)}</p>
                    <p className="text-[11px] text-ink-500">frais de retour</p>
                  </div>
                </div>
                <PackagesDetails ids={r.deliveryIds} deliveriesById={deliveriesById} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        active ? "bg-white text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-800"
      )}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function PackageRow({ delivery, amount }: { delivery: ClientDelivery; amount?: number }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <Link to={`/client/deliveries/${encodeURIComponent(delivery.id)}`} className="min-w-0 hover:underline">
        <p className="truncate font-medium text-ink-900">{delivery.id}</p>
        <p className="truncate text-xs text-ink-500">
          {clientDeliveryRecipientFullName(delivery)} · {delivery.designation}
        </p>
      </Link>
      {amount !== undefined && <p className="shrink-0 font-semibold tabular-nums text-ink-900">{formatAmount(amount)}</p>}
    </li>
  );
}

/** Expandable list of the packages covered by a payout / return. Unknown ids are still shown. */
function PackagesDetails({
  ids,
  deliveriesById,
  showAmount = false,
}: {
  ids: string[];
  deliveriesById: Map<string, ClientDelivery>;
  showAmount?: boolean;
}) {
  if (!ids || ids.length === 0) return null;
  return (
    <details className="group mt-3 border-t border-ink-100 pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-brand-600">
        Voir les {ids.length} colis
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 divide-y divide-ink-100 text-sm">
        {ids.map((id) => {
          const d = deliveriesById.get(id);
          return d ? (
            <PackageRow key={id} delivery={d} amount={showAmount ? d.amount : undefined} />
          ) : (
            <li key={id} className="flex items-center gap-2 py-2 text-ink-700">
              <Package className="h-4 w-4 text-ink-400" /> {id}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-12 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
      <p className="font-display font-semibold text-ink-900">Impossible de charger l'historique</p>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
      >
        <RefreshCw className="h-4 w-4" /> Réessayer
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-display font-semibold text-ink-900">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{text}</p>
    </div>
  );
}
