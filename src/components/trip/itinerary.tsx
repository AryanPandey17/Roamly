import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const TYPE_LABEL: Record<Tables<"itinerary_items">["type"], string> = {
  flight: "Flight",
  stay: "Stay",
  activity: "Activity",
  meal: "Daily costs",
  transfer: "Transfer",
  note: "Note",
};

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
};

const detailsOf = (item: Tables<"itinerary_items">) =>
  (item.details ?? {}) as { isEstimate?: boolean; sourceUrl?: string | null };
const isEstimate = (item: Tables<"itinerary_items">) => Boolean(detailsOf(item).isEstimate);

const hhmm = (time: string | null) => (time ? time.slice(0, 5) : null);

type Breakdown = { flights: number; stay: number; activities: number; food: number; localTransport: number; total: number };

export function ItineraryView({
  itinerary,
  days,
  items,
}: {
  itinerary: Tables<"itineraries">;
  days: Tables<"itinerary_days">[];
  items: Tables<"itinerary_items">[];
}) {
  const currency = itinerary.currency;
  const breakdown = itinerary.cost_breakdown as unknown as Breakdown;
  const hasEstimates = items.some((item) => isEstimate(item));
  const rows = [
    ["Flights", breakdown.flights],
    ["Stay", breakdown.stay],
    ["Activities", breakdown.activities],
    ["Food (estimate)", breakdown.food],
    ["Local transport (estimate)", breakdown.localTransport],
  ] as const;

  return (
    <section className="space-y-4" aria-labelledby="itinerary-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="itinerary-heading" className="text-xl font-semibold">
          Itinerary
        </h2>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium",
            itinerary.fits_budget ? "border-success text-success" : "border-danger text-danger"
          )}
        >
          {itinerary.fits_budget
            ? `Within budget: ${money(itinerary.total_cost, currency)} of ${money(itinerary.budget_amount, currency)}`
            : `Over budget by ${money(itinerary.over_by, currency)}`}
        </span>
      </div>

      {hasEstimates ? (
        <p role="note" className="text-sm text-muted">
          Flight and stay prices are live search results. Amounts marked “est.” are estimates read from web sources,
          not quoted prices.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <ol className="space-y-4">
          {days.map((day) => (
            <li key={day.id}>
              <Card className="space-y-3">
                <h3 className="font-medium">
                  Day {day.day_number} <span className="font-normal text-muted">· {day.date} · {day.title}</span>
                </h3>
                {day.notes ? <p className="text-sm text-muted">Forecast: {day.notes}</p> : null}
                <ul className="divide-y divide-border">
                  {items
                    .filter((item) => item.day_id === day.id)
                    .map((item) => (
                      <li key={item.id} className="flex gap-3 py-2 text-sm">
                        <span className="w-24 shrink-0 tabular-nums text-muted">
                          {hhmm(item.start_time) ?? TYPE_LABEL[item.type]}
                          {item.end_time ? `–${hhmm(item.end_time)}` : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          {item.deep_link ? (
                            <a href={item.deep_link} target="_blank" rel="noreferrer" className="font-medium underline">
                              {item.title}
                            </a>
                          ) : (
                            <span className="font-medium">{item.title}</span>
                          )}
                          {item.description ? <span className="block text-muted">{item.description}</span> : null}
                          {detailsOf(item).sourceUrl ? (
                            <a
                              href={detailsOf(item).sourceUrl!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted underline"
                            >
                              Source of estimate
                            </a>
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {item.cost_amount > 0
                            ? `${isEstimate(item) ? "est. " : ""}${money(item.cost_amount, currency)}`
                            : item.type === "activity" && !item.description?.includes("not found")
                              ? "Free"
                              : "–"}
                        </span>
                      </li>
                    ))}
                </ul>
              </Card>
            </li>
          ))}
        </ol>

        <Card className="h-fit space-y-3">
          <h3 className="text-sm font-medium">Cost breakdown</h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {rows.map(([label, amount]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right tabular-nums">{money(amount, currency)}</dd>
              </div>
            ))}
            <dt className="border-t border-border pt-2 font-medium">Total</dt>
            <dd className="border-t border-border pt-2 text-right font-medium tabular-nums">
              {money(breakdown.total, currency)}
            </dd>
          </dl>
          {itinerary.assumptions.length > 0 ? (
            <>
              <h3 className="pt-2 text-sm font-medium">Notes and assumptions</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                {itinerary.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
