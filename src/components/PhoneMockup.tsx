import { MapPin, Check, CheckCheck, Navigation } from "lucide-react";

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] select-none sm:max-w-[320px]">
      {/* phone frame */}
      <div className="relative rounded-[2.25rem] border-[6px] border-ink-950 bg-ink-950 shadow-[0_30px_60px_-15px_rgba(16,24,40,0.35)]">
        <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-ink-950" />
        <div className="overflow-hidden rounded-[1.85rem] bg-[#EDF1F7]">
          {/* chat header */}
          <div className="flex items-center gap-2.5 bg-[#0B7A5A] px-4 pb-3 pt-6 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
              K
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight">Taher chourabi · DropLinki</p>
              <p className="text-[10px] text-white/70">en ligne</p>
            </div>
          </div>

          {/* chat body */}
          <div className="space-y-2.5 px-3 py-4">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2.5 text-[11.5px] leading-snug text-ink-900 shadow-sm">
              🚚 Votre livraison est en route.
              <br />
              Ouvrez ce lien pour partager votre position&nbsp;:
              <br />
              <span className="font-semibold text-brand-700">droplink.app/d/DL-1042</span>
              <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-ink-500">
                10:43 <CheckCheck className="h-3 w-3 text-[#34B7F1]" />
              </div>
            </div>

            <div className="mx-auto w-fit rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-medium text-ink-500 shadow-sm">
              Le client ouvre le lien
            </div>

            <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3 py-3 text-[11.5px] leading-snug text-ink-900 shadow-sm">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-go-600">
                <MapPin className="h-3.5 w-3.5" /> Position partagée
              </div>
              <div className="relative h-20 overflow-hidden rounded-lg bg-[#DCE7F5]">
                <svg viewBox="0 0 200 90" className="h-full w-full opacity-70">
                  <path d="M0 60 Q 50 20 100 55 T 200 40" stroke="#B7C6E6" strokeWidth="6" fill="none" />
                  <path d="M0 75 Q 60 90 130 70 T 200 80" stroke="#C9D6EE" strokeWidth="10" fill="none" />
                </svg>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-go-500 text-white shadow ring-4 ring-white">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-ink-400">
                10:47 <Check className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating status card */}
      <div className="animate-rise-in absolute -right-6 -bottom-6 w-[190px] rounded-2xl border border-ink-100 bg-white p-3.5 shadow-lift sm:-right-10">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-go-600">
          <span className="h-1.5 w-1.5 rounded-full bg-go-500" /> Position reçue
        </div>
        <p className="mb-2.5 text-[11px] text-ink-500">Ahmed T. · à 4,7 km</p>
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-[11px] font-semibold text-white">
          <Navigation className="h-3 w-3" /> Ouvrir Google Maps
        </div>
      </div>
    </div>
  );
}
