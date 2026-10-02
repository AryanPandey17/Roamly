import type { Enums } from "@/types/database";

export const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
};

/** "08:30:00" → "08:30" */
export const hhmm = (time: string | null) => (time ? time.slice(0, 5) : null);

/** "2026-11-07" → "Sat 7 Nov" */
export const shortDate = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
};

export type Breakdown = {
  flights: number;
  stay: number;
  activities: number;
  food: number;
  localTransport: number;
  total: number;
};

export const BREAKDOWN_ROWS: { key: keyof Omit<Breakdown, "total">; label: string; tone: string }[] = [
  { key: "flights", label: "Flights", tone: "bg-agent-logistics" },
  { key: "stay", label: "Stay", tone: "bg-agent-recommendations" },
  { key: "activities", label: "Activities", tone: "bg-primary" },
  { key: "food", label: "Food (estimate)", tone: "bg-agent-budget" },
  { key: "localTransport", label: "Local transport (estimate)", tone: "bg-agent-supervisor" },
];

/** Trip status as shown to the user. Lives here (not in a client file) so server components can use it too. */
export const STATUS: Record<Enums<"trip_status">, { label: string; tone: "neutral" | "success" | "danger" | "warning" | "primary" }> = {
  draft: { label: "Draft", tone: "neutral" },
  planning: { label: "Planning", tone: "primary" },
  ready: { label: "Within budget", tone: "success" },
  over_budget: { label: "Over budget", tone: "danger" },
  paused: { label: "Paused", tone: "warning" },
  failed: { label: "Stopped", tone: "danger" },
};

