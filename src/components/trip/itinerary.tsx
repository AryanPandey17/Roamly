"use client";

import {
  Bookmark,
  BookmarkCheck,
  CloudSun,
  ExternalLink,
  MapPin,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { BudgetMeter } from "./budget-meter";
import { hhmm, money, shortDate, type Breakdown } from "./format";
import type { MapPoint } from "./map";

// Leaflet needs `window`, so the map is loaded in the browser only.
const TripMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

type Item = Tables<"itinerary_items">;
type Day = Tables<"itinerary_days">;

const TYPE_LABEL: Record<Item["type"], string> = {
  flight: "Flight",
  stay: "Stay",
  activity: "Activity",
  meal: "Daily costs",
  transfer: "Transfer",
  note: "Note",
};

const detailsOf = (item: Item) =>
  (item.details ?? {}) as { isEstimate?: boolean; sourceUrl?: string | null };

/** Items of a day in the order they happen: timed items by time, untimed ones where they were placed. */
const inOrder = (items: Item[]) =>
  [...items].sort((a, b) => {
    if (a.start_time && b.start_time)
      return a.start_time.localeCompare(b.start_time);
    return a.position - b.position;
  });

export function ItineraryBoard({
  tripId,
  itinerary,
  days,
  items,
  savedKeys = [],
  editable = false,
}: {
  tripId?: string;
  itinerary: Tables<"itineraries">;
  days: Day[];
  items: Item[];
  /** `provider:external_id` of options the user has already saved. */
  savedKeys?: string[];
  editable?: boolean;
}) {
  const router = useRouter();
  const [activeDay, setActiveDay] = useState<string>("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [saved, setSaved] = useState(() => new Set(savedKeys));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currency = itinerary.currency;
  const breakdown = itinerary.cost_breakdown as unknown as Breakdown;
  const visibleDays =
    activeDay === "all" ? days : days.filter((d) => d.id === activeDay);

  // Numbered stops for the map: every item that has coordinates, in day and time order.
  const { points, labelOf } = useMemo(() => {
    const list: MapPoint[] = [];
    const labels = new Map<string, string>();
    for (const day of visibleDays) {
      let n = 0;
      for (const item of inOrder(items.filter((i) => i.day_id === day.id))) {
        if (item.lat === null || item.lng === null) continue;
        n += 1;
        const label = activeDay === "all" ? `${day.day_number}` : `${n}`;
        labels.set(item.id, label);
        list.push({
          id: item.id,
          dayId: day.id,
          label,
          title: item.title,
          subtitle: `Day ${day.day_number}${item.start_time ? `, ${hhmm(item.start_time)}` : ""}`,
          type: item.type,
          lat: item.lat,
          lng: item.lng,
        });
      }
    }
    return { points: list, labelOf: labels };
  }, [visibleDays, items, activeDay]);

  async function send(url: string, init: RequestInit, onOk?: () => void) {
    setError(null);
    const response = await fetch(url, init);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "That change could not be saved.");
      return;
    }
    onOk?.();
    startTransition(() => router.refresh());
  }

  const patch = (item: Item, body: { dayId?: string; startTime?: string }) =>
    send(`/api/trips/${tripId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const remove = (item: Item) => {
    if (!window.confirm(`Remove "${item.title}" from the itinerary?`)) return;
    return send(`/api/trips/${tripId}/items/${item.id}`, { method: "DELETE" });
  };

  const save = (item: Item) =>
    send(
      "/api/saved",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      },
      () =>
        setSaved((current) =>
          new Set(current).add(`${item.provider}:${item.external_id}`),
        ),
    );

  return (
    <section className="space-y-5" aria-labelledby="itinerary-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="itinerary-heading"
          className="font-display text-2xl font-extrabold"
        >
          Itinerary
        </h2>
        <Badge
          tone={itinerary.fits_budget ? "success" : "danger"}
          className="px-3 py-1 text-sm"
        >
          {itinerary.fits_budget
            ? `Within budget: ${money(itinerary.total_cost, currency)} of ${money(itinerary.budget_amount, currency)}`
            : `Over budget by ${money(itinerary.over_by, currency)}`}
        </Badge>
      </div>

      {/* Day filter */}
      <div
        role="tablist"
        aria-label="Days"
        className="flex gap-2 overflow-x-auto pb-1 print:hidden"
      >
        {[
          { id: "all", label: "All days" },
          ...days.map((d) => ({ id: d.id, label: `Day ${d.day_number}` })),
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeDay === tab.id}
            onClick={() => setActiveDay(tab.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition",
              activeDay === tab.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <ol className={cn("space-y-4", pending && "opacity-70")}>
          {visibleDays.map((day) => (
            <li key={day.id}>
              <Card className="space-y-3">
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-extrabold">
                    Day {day.day_number}
                    <span className="ml-2 font-sans text-sm font-normal text-muted">
                      {shortDate(day.date)} · {day.title}
                    </span>
                  </h3>
                  {day.notes ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <CloudSun className="size-3.5" aria-hidden /> {day.notes}
                    </span>
                  ) : null}
                </header>

                <ul className="divide-y divide-border">
                  {inOrder(items.filter((item) => item.day_id === day.id)).map(
                    (item) => {
                      const { isEstimate, sourceUrl } = detailsOf(item);
                      const label = labelOf.get(item.id);
                      const isSaved = saved.has(
                        `${item.provider}:${item.external_id}`,
                      );
                      // The return-flight row repeats the outbound option at no cost; only the priced row is saveable.
                      const canSave =
                        editable &&
                        Boolean(item.external_id) &&
                        (item.type === "activity" ||
                          ((item.type === "flight" || item.type === "stay") &&
                            item.cost_amount > 0));
                      const unknownPrice =
                        item.type === "activity" &&
                        item.description?.includes("price not found");
                      return (
                        <li
                          key={item.id}
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onFocus={() => setHoveredId(item.id)}
                          onBlur={() => setHoveredId(null)}
                          className={cn(
                            "-mx-2 flex gap-3 rounded-md px-2 py-3 text-sm transition-colors",
                            hoveredId === item.id && "bg-surface-2",
                          )}
                        >
                          <div className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-muted">
                            {hhmm(item.start_time) ?? TYPE_LABEL[item.type]}
                            {item.end_time ? (
                              <span className="block">
                                {hhmm(item.end_time)}
                              </span>
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="flex flex-wrap items-center gap-2 font-medium">
                              {label ? (
                                <span
                                  aria-hidden
                                  className="grid size-5 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary"
                                >
                                  {label}
                                </span>
                              ) : null}
                              {item.title}
                            </p>
                            {item.description ? (
                              <p className="text-muted">{item.description}</p>
                            ) : null}
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                              {item.deep_link ? (
                                <a
                                  href={item.deep_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                >
                                  {item.type === "flight" ||
                                  item.type === "stay"
                                    ? "View and book"
                                    : "Open"}
                                  <ExternalLink
                                    className="size-3"
                                    aria-hidden
                                  />
                                </a>
                              ) : null}
                              {sourceUrl ? (
                                <a
                                  href={sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  Source of estimate
                                </a>
                              ) : null}
                              {item.lat !== null && !label ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="size-3" aria-hidden /> On
                                  map
                                </span>
                              ) : null}
                            </p>

                            {editable && item.type === "activity" ? (
                              <div className="flex flex-wrap items-center gap-2 pt-1 print:hidden">
                                <label
                                  className="sr-only"
                                  htmlFor={`time-${item.id}`}
                                >
                                  Start time for {item.title}
                                </label>
                                <input
                                  id={`time-${item.id}`}
                                  type="time"
                                  defaultValue={hhmm(item.start_time) ?? ""}
                                  onBlur={(e) => {
                                    const value = e.currentTarget.value;
                                    if (
                                      value &&
                                      value !== hhmm(item.start_time)
                                    )
                                      void patch(item, { startTime: value });
                                  }}
                                  className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
                                />
                                <label
                                  className="sr-only"
                                  htmlFor={`day-${item.id}`}
                                >
                                  Day for {item.title}
                                </label>
                                <select
                                  id={`day-${item.id}`}
                                  value={item.day_id}
                                  onChange={(e) =>
                                    void patch(item, {
                                      dayId: e.currentTarget.value,
                                    })
                                  }
                                  className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
                                >
                                  {days.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      Day {d.day_number}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void remove(item)}
                                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted hover:bg-danger/10 hover:text-danger"
                                >
                                  <Trash2 className="size-3.5" aria-hidden />{" "}
                                  Remove
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="tabular-nums">
                              {item.cost_amount > 0 ? (
                                <>
                                  {isEstimate ? (
                                    <span className="mr-1 text-xs text-muted">
                                      est.
                                    </span>
                                  ) : null}
                                  {money(item.cost_amount, currency)}
                                </>
                              ) : unknownPrice ? (
                                <span className="text-muted">–</span>
                              ) : item.type === "activity" ? (
                                <span className="text-success">Free</span>
                              ) : (
                                <span className="text-muted">Included</span>
                              )}
                            </span>
                            {canSave ? (
                              <button
                                type="button"
                                onClick={() =>
                                  isSaved ? undefined : void save(item)
                                }
                                aria-pressed={isSaved}
                                aria-label={
                                  isSaved
                                    ? `${item.title} is saved`
                                    : `Save ${item.title}`
                                }
                                title={isSaved ? "Saved" : "Save for later"}
                                className={cn(
                                  "grid size-7 place-items-center rounded-full print:hidden",
                                  isSaved
                                    ? "text-primary"
                                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                                )}
                              >
                                {isSaved ? (
                                  <BookmarkCheck
                                    className="size-4"
                                    aria-hidden
                                  />
                                ) : (
                                  <Bookmark className="size-4" aria-hidden />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    },
                  )}
                </ul>
              </Card>
            </li>
          ))}
        </ol>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="h-72 overflow-hidden rounded-lg border border-border shadow-card sm:h-96 print:hidden">
            {points.length > 0 ? (
              <TripMap
                points={points}
                hoveredId={hoveredId}
                onHover={setHoveredId}
              />
            ) : (
              <div className="grid h-full place-items-center bg-surface-2 text-sm text-muted">
                No mapped stops for this day.
              </div>
            )}
          </div>

          <Card className="space-y-4">
            <h3 className="text-sm font-medium">Cost breakdown</h3>
            <BudgetMeter
              breakdown={breakdown}
              limit={itinerary.budget_amount}
              currency={currency}
            />
            <p className="text-xs text-muted">
              Flight and stay prices are live search results. Amounts marked
              “est.” are read from web sources, not quoted prices.
            </p>
          </Card>

          {itinerary.assumptions.length > 0 ? (
            <Card className="space-y-2">
              <h3 className="text-sm font-medium">Notes and assumptions</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                {itinerary.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
