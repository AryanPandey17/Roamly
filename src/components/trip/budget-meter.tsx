import { cn } from "@/lib/utils";
import { BREAKDOWN_ROWS, money, type Breakdown } from "./format";

/**
 * Spend against the limit. The bar is split by category and scaled to
 * whichever is larger, the total or the limit, so an overrun is visible as
 * the bar passing the limit marker.
 */
export function BudgetMeter({
  breakdown,
  limit,
  currency,
  compact = false,
}: {
  breakdown: Breakdown;
  limit: number;
  currency: string;
  compact?: boolean;
}) {
  const over = breakdown.total > limit;
  const scale = Math.max(breakdown.total, limit) || 1;
  const overBy = Math.max(0, breakdown.total - limit);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-display text-2xl font-extrabold tabular-nums">
          {money(breakdown.total, currency)}
          <span className="ml-1.5 font-sans text-sm font-normal text-muted">of {money(limit, currency)}</span>
        </p>
        <span className={cn("text-sm font-medium", over ? "text-danger" : "text-success")}>
          {over ? `Over by ${money(overBy, currency)}` : `${money(limit - breakdown.total, currency)} to spare`}
        </span>
      </div>

      <div
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={Math.round(limit)}
        aria-valuenow={Math.round(breakdown.total)}
        aria-valuetext={`${money(breakdown.total, currency)} of ${money(limit, currency)}`}
        className="relative"
      >
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
          {BREAKDOWN_ROWS.map((row) => (
            <div
              key={row.key}
              className={cn("h-full transition-[width] duration-700 ease-out", row.tone)}
              style={{ width: `${(breakdown[row.key] / scale) * 100}%` }}
            />
          ))}
        </div>
        {/* Limit marker */}
        <div
          aria-hidden
          className="absolute -top-1 h-5 w-0.5 rounded bg-foreground transition-[left] duration-700"
          style={{ left: `calc(${(limit / scale) * 100}% - 1px)` }}
        />
      </div>

      {compact ? null : (
        <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 text-sm">
          {BREAKDOWN_ROWS.map((row) => (
            <div key={row.key} className="contents">
              <span aria-hidden className={cn("size-2.5 rounded-full", row.tone)} />
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-right tabular-nums">{money(breakdown[row.key], currency)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
