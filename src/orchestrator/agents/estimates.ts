// Costs that no free API quotes: entry prices for attractions and daily food
// and local transport. They are read from web search results by the fast
// model, converted to the trip currency, cached, and always labelled as
// estimates with their source. If nothing usable is found, the figure is left
// out and the itinerary says so. No number is ever made up.

import { z } from "zod";
import { CACHE_TTL } from "../config";
import { isResumable } from "../errors";
import type { Estimates, ParsedRequest, PlaceOption, Preferences } from "../state";
import { cacheKey, convert, webSearch } from "../tools";
import { decide, type AgentContext } from "./runner";

const callContext = (ctx: AgentContext) => ({
  telemetry: ctx.deps.telemetry,
  cache: ctx.deps.cache,
  providers: ctx.deps.providers,
  meta: ctx.meta,
  meter: ctx.meter,
});

const currencyCode = z.string().regex(/^[A-Za-z]{3}$/);

// ---------------------------------------------------------------------------
// Daily food and local transport
// ---------------------------------------------------------------------------
const dailySchema = z.object({
  foodPerDay: z.number().positive().nullable(),
  localTransportPerDay: z.number().positive().nullable(),
  currency: currencyCode.nullable(),
  sourceIndex: z.number().int().nullable(),
});

const DAILY_SYSTEM = `You extract travel cost figures from web search results.

Given search results about what a traveller spends per day in a city, return the typical cost for ONE person for ONE day, for the stated travel style:
- foodPerDay: three meals
- localTransportPerDay: getting around the city by public transport or short rides

Rules:
- Use only figures that appear in the results. If the results give a range, use the part of the range that fits the style (saver: low end, balanced: middle, comfort: high end).
- Give the amounts in the currency the source uses, and say which currency (3-letter code).
- sourceIndex is the number of the result you relied on most.
- If the results do not contain a usable figure, return null for it. Never guess.

Reply with one JSON object only:
{"foodPerDay": number|null, "localTransportPerDay": number|null, "currency": string|null, "sourceIndex": number|null}`;

const unavailable = (currency: string): Estimates => ({
  foodPerDay: 0,
  localTransportPerDay: 0,
  currency,
  source: "not available",
  sourceUrl: null,
  available: false,
});

/** Per-person daily food and local transport in the trip currency, as a labelled estimate. */
export async function estimateDailyCosts(
  ctx: AgentContext,
  request: ParsedRequest,
  preferences: Preferences
): Promise<Estimates> {
  const currency = request.budget.currency;
  const where = [request.destination.name, request.destination.country].filter(Boolean).join(", ");
  const key = cacheKey("estimate_daily_costs", { where: where.toLowerCase(), style: preferences.budgetStyle, currency });

  const cached = (await ctx.deps.cache.get(key).catch(() => null)) as Estimates | null;
  if (cached) return cached;

  try {
    const results = await webSearch(callContext(ctx), `average daily cost of food and local transport for a tourist in ${where}`);
    if (results.length === 0) return unavailable(currency);

    const decision = await decide(ctx, {
      role: "fast",
      system: DAILY_SYSTEM,
      user: JSON.stringify({
        city: where,
        style: preferences.budgetStyle,
        results: results.map((r, i) => ({ index: i, title: r.title, text: r.snippet })),
      }),
      schema: dailySchema,
    });
    const found = decision.value;
    if (!found?.currency || (found.foodPerDay === null && found.localTransportPerDay === null)) {
      return unavailable(currency);
    }

    const cc = callContext(ctx);
    const food = found.foodPerDay === null ? 0 : await convert(cc, found.foodPerDay, found.currency, currency);
    const transport =
      found.localTransportPerDay === null ? 0 : await convert(cc, found.localTransportPerDay, found.currency, currency);
    const source = results[found.sourceIndex ?? 0] ?? results[0];

    const estimates: Estimates = {
      foodPerDay: Math.round(food),
      localTransportPerDay: Math.round(transport),
      currency,
      source: "web estimate",
      sourceUrl: source.url,
      available: true,
    };
    await ctx.deps.cache.set(key, "estimate_daily_costs", estimates, CACHE_TTL.dailyCosts).catch(() => undefined);
    return estimates;
  } catch (error) {
    // A paused run is fine for searches the plan depends on. An optional
    // estimate should not stop the trip: leave it out and say so.
    if (isResumable(error) && (error as { name: string }).name === "ProviderExhaustedError") throw error;
    return unavailable(currency);
  }
}

// ---------------------------------------------------------------------------
// Entry prices for attractions
// ---------------------------------------------------------------------------
const pricesSchema = z.object({
  currency: currencyCode.nullable(),
  prices: z.array(
    z.object({
      index: z.number().int(),
      /** Adult entry price; 0 if the results say it is free; null if not stated. */
      price: z.number().nonnegative().nullable(),
      sourceIndex: z.number().int().nullable(),
    })
  ),
});

const PRICES_SYSTEM = `You extract entry prices for attractions from web search results.

For each attraction in the list, find the adult entry or ticket price in the search results.

Rules:
- Use only prices that appear in the results for that attraction. If the results say it is free, use 0.
- If the results do not state a price for an attraction, use null. Never guess and never reuse another attraction's price.
- All prices in one currency: the one the sources use. Say which (3-letter code).
- sourceIndex is the number of the result the price came from.

Reply with one JSON object only:
{"currency": string|null, "prices": [{"index": number, "price": number|null, "sourceIndex": number|null}]}`;

/**
 * Fills in entry prices for places that are not free by nature. Places whose
 * price cannot be found stay at 0 with priceKnown = false, so the UI and the
 * assumptions list can say that their cost is not included.
 */
export async function priceActivities(
  ctx: AgentContext,
  request: ParsedRequest,
  places: PlaceOption[]
): Promise<PlaceOption[]> {
  const unknown = places.filter((p) => !p.priceKnown);
  if (unknown.length === 0) return places;

  const currency = request.budget.currency;
  const where = [request.destination.name, request.destination.country].filter(Boolean).join(", ");
  const key = cacheKey("estimate_activity_prices", { where: where.toLowerCase(), currency, ids: unknown.map((p) => p.id).sort() });

  type Priced = Record<string, { price: number; sourceUrl: string | null }>;
  let priced = (await ctx.deps.cache.get(key).catch(() => null)) as Priced | null;

  if (!priced) {
    priced = {};
    try {
      const names = unknown.slice(0, 6).map((p) => p.name).join(", ");
      const results = await webSearch(callContext(ctx), `${where} entry fee ticket price ${names}`);
      if (results.length > 0) {
        const decision = await decide(ctx, {
          role: "fast",
          system: PRICES_SYSTEM,
          user: JSON.stringify({
            city: where,
            attractions: unknown.map((p, i) => ({ index: i, name: p.name })),
            results: results.map((r, i) => ({ index: i, title: r.title, text: r.snippet })),
          }),
          schema: pricesSchema,
        });
        const found = decision.value;
        if (found?.currency) {
          const cc = callContext(ctx);
          for (const entry of found.prices) {
            const place = unknown[entry.index];
            if (!place || entry.price === null) continue;
            priced[place.id] = {
              price: Math.round(await convert(cc, entry.price, found.currency, currency)),
              sourceUrl: results[entry.sourceIndex ?? -1]?.url ?? null,
            };
          }
          await ctx.deps.cache.set(key, "estimate_activity_prices", priced, CACHE_TTL.activityPrices).catch(() => undefined);
        }
      }
    } catch (error) {
      if (isResumable(error) && (error as { name: string }).name === "ProviderExhaustedError") throw error;
      // Search or conversion unavailable: prices stay unknown and are flagged.
    }
  }

  return places.map((place) => {
    const hit = priced![place.id];
    if (place.priceKnown || !hit) return place;
    return { ...place, price: hit.price, priceKnown: true, priceIsEstimate: hit.price > 0, sourceUrl: hit.sourceUrl };
  });
}
