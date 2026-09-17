export type DeliveryStatus = "waiting_location" | "location_received" | "opened" | "delivered";

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string; // ISO
}

export interface Delivery {
  id: string; // e.g. DL-1042
  customerName: string;
  customerPhone: string;
  reference?: string;
  amount?: number;
  notes?: string;
  status: DeliveryStatus;
  shareUrl: string; // relative path e.g. /d/DL-1042
  customerLatitude?: number;
  customerLongitude?: number;
  /**
   * Static placeholder coordinates from the backend record. Kept for API
   * compatibility only — the UI must NOT use these to show the driver's
   * position. The driver's real position comes live from the browser's
   * Geolocation API (see src/hooks/useLiveLocation.ts), since the driver is
   * whoever is holding the device the app is running on.
   */
  driverLatitude: number;
  driverLongitude: number;
  createdAt: string; // ISO
  linkSentAt?: string;
  linkOpenedAt?: string;
  locationReceivedAt?: string;
  completedAt?: string;
  timeline: TimelineEvent[];
}

export interface Driver {
  id?: string;
  name: string;
  phone?: string;
  email: string;
  plan: "free" | "pro";
  emailVerified: boolean 
}

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  waiting_location: "En attente de position",
  location_received: "Position reçue",
  delivered: "Livrée",
  opened :"Lien ouvert"
};

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  waiting_location: "bg-warn-50 text-warn-600 ring-warn-500/20",
  location_received: "bg-go-50 text-go-600 ring-go-500/20",
  delivered: "bg-ink-100 text-ink-700 ring-ink-300",
  opened: "bg-blue-100 text-blue-700 ring-blue-500/30",
};
