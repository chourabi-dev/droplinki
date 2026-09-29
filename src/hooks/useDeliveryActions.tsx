import { useState } from "react";
import { CallAssistant } from "@/components/CallAssistant";
import { RescheduleSheet } from "@/components/RescheduleSheet";
import { Delivery } from "@/types";

/**
 * One call-assistant + one reschedule sheet per page, opened for whichever
 * delivery the driver taps, instead of mounting a sheet inside every card.
 */
export function useDeliveryActions() {
  const [calling, setCalling] = useState<Delivery | null>(null);
  const [rescheduling, setRescheduling] = useState<Delivery | null>(null);

  const sheets = (
    <>
      <CallAssistant delivery={calling} onClose={() => setCalling(null)} onReschedule={(d) => setRescheduling(d)} />
      <RescheduleSheet delivery={rescheduling} onClose={() => setRescheduling(null)} />
    </>
  );

  return { callDelivery: setCalling, rescheduleDelivery: setRescheduling, sheets };
}
