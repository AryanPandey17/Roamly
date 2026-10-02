// Places and travel times from Geoapify (OpenStreetMap data).
// Free plan: 3,000 credits a day. Places carry no ratings and no prices, so
// ranking uses interest match and notability, and paid entry is estimated
// separately (see agents/estimates.ts).

import { z } from "zod";
import type { PlaceSearch, TravelProviders } from "../ports";
import type { PlaceOption } from "../state";
import { distanceKm } from "./airports";
import { fetchJson, requireKey } from "./http";

type Env = Record<string, string | undefined>;
const NAME = "geoapify";

/** Interest keyword → Geoapify categories, most specific first. */
const CATEGORIES: Record<string, string[]> = {
  culture: ["tourism", "entertainment.culture", "heritage"],
  history: ["heritage", "entertainment.museum", "tourism"],
  art: [
    "entertainment.culture.gallery",
    "entertainment.museum",
    "entertainment.culture.arts_centre",
  ],
  food: ["catering.restaurant", "commercial.marketplace", "catering.cafe"],
  nature: ["leisure.park", "natural", "national_park"],
  adventure: ["natural.mountain", "entertainment.theme_park", "national_park"],
  nightlife: ["adult.nightclub", "catering.bar"],
  shopping: ["commercial.shopping_mall", "commercial.marketplace"],
  beaches: ["natural.coastal"],
  photography: ["tourism", "natural", "heritage"],
  wellness: ["leisure.spa", "leisure.park.garden"],
  technology: ["entertainment.museum", "entertainment"],
};
const DEFAULT_CATEGORIES = ["tourism", "entertainment.museum", "leisure.park"];

/** Categories that cost nothing to visit by their nature. */
const FREE_PREFIXES = [
  "leisure.park",
  "natural",
  "national_park",
  "commercial.marketplace",
  "commercial.shopping_mall",
];
/** Eating and drinking is covered by the daily food estimate, not priced per place. */
const FOOD_PREFIXES = ["catering"];

/** Typical visit length in minutes by category prefix. A planning heuristic, not data. */
const VISIT_MINUTES: [string, number][] = [
  ["entertainment.museum", 120],
  ["entertainment.theme_park", 300],
  ["entertainment.zoo", 180],
  ["entertainment.aquarium", 120],
  ["entertainment.culture", 120],
  ["national_park", 240],
  ["natural.mountain", 240],
  ["natural", 120],
  ["leisure.spa", 120],
  ["leisure.park", 90],
  ["catering", 75],
  ["commercial", 90],
  ["adult.nightclub", 150],
  ["heritage", 60],
  ["tourism", 60],
];

const featureSchema = z.object({
  properties: z.object({
    name: z.string().optional(),
    lat: z.number(),
    lon: z.number(),
    formatted: z.string().optional(),
    categories: z.array(z.string()).optional(),
    place_id: z.string().optional(),
    website: z.string().optional(),
    wiki_and_media: z.unknown().optional(),
    datasource: z
      .object({ raw: z.record(z.string(), z.unknown()).optional() })
      .optional(),
  }),
});
const collectionSchema = z.object({
  features: z.array(z.unknown()).default([]),
});
const routeSchema = z.object({
  features: z
    .array(z.object({ properties: z.object({ time: z.number() }) }))
    .min(1),
});

const hasPrefix = (categories: string[], prefixes: string[]) =>
  categories.some((c) =>
    prefixes.some((p) => c === p || c.startsWith(`${p}.`)),
  );

function categoriesFor(interests: string[]) {
  const wanted = interests.flatMap((i) => CATEGORIES[i.toLowerCase()] ?? []);
  return [...new Set(wanted.length ? wanted : DEFAULT_CATEGORIES)].slice(0, 8);
}

/** Human label for a place: the interest it matched, else a tidy version of its category. */
function labelFor(categories: string[], interests: string[]) {
  for (const interest of interests) {
    if (hasPrefix(categories, CATEGORIES[interest.toLowerCase()] ?? []))
      return interest;
  }
  const leaf = (categories[categories.length - 1] ?? "sight").split(".").pop()!;
  return leaf.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function geoapifyPlaces(env: Env): TravelProviders["places"] {
  async function fetchPlaces(query: PlaceSearch, categories: string[]) {
    const url = new URL("https://api.geoapify.com/v2/places");
    url.searchParams.set("categories", categories.join(","));
    url.searchParams.set(
      "filter",
      `circle:${query.near.lng},${query.near.lat},10000`,
    );
    url.searchParams.set(
      "bias",
      `proximity:${query.near.lng},${query.near.lat}`,
    );
    url.searchParams.set("conditions", "named");
    url.searchParams.set("lang", "en");
    url.searchParams.set("limit", "60");
    url.searchParams.set(
      "apiKey",
      requireKey(env, "GEOAPIFY_API_KEY", "Geoapify"),
    );
    return collectionSchema.parse(
      await fetchJson("search_places", "Geoapify", url),
    ).features;
  }

  return {
    name: NAME,
    async search(query) {
      let features: unknown[];
      try {
        features = await fetchPlaces(query, categoriesFor(query.interests));
      } catch (error) {
        // An unsupported category makes the whole request fail; fall back to the broad one.
        if (!(error instanceof Error) || !/returned 400/.test(error.message))
          throw error;
        features = await fetchPlaces(query, ["tourism"]);
      }

      const seen = new Set<string>();
      const places: {
        place: PlaceOption;
        notable: boolean;
        km: number;
        food: boolean;
      }[] = [];
      for (const feature of features) {
        const parsed = featureSchema.safeParse(feature);
        if (!parsed.success) continue;
        const p = parsed.data.properties;
        const name = p.name?.trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());

        const categories = p.categories ?? [];
        const raw = p.datasource?.raw ?? {};
        const food = hasPrefix(categories, FOOD_PREFIXES);
        const free = raw.fee === "no" || hasPrefix(categories, FREE_PREFIXES);
        const website =
          p.website ??
          (typeof raw.website === "string" ? raw.website : undefined);

        places.push({
          place: {
            id: `geo-${p.place_id ?? `${p.lat},${p.lon}`}`,
            provider: NAME,
            name,
            category: labelFor(categories, query.interests),
            rating: null, // OpenStreetMap has no ratings
            lat: p.lat,
            lng: p.lon,
            price: 0,
            currency: query.currency,
            // Free places and places to eat need no entry price. Everything else is priced by estimate later.
            priceKnown: free || food,
            priceIsEstimate: false,
            sourceUrl: null,
            durationMinutes:
              VISIT_MINUTES.find(([prefix]) =>
                hasPrefix(categories, [prefix]),
              )?.[1] ?? 60,
            description: food
              ? `${p.formatted ?? name}. Meals are covered by the daily food estimate.`
              : (p.formatted ?? name),
            deepLink:
              website ??
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${p.lat},${p.lon}`)}`,
          },
          notable: Boolean(p.wiki_and_media || raw.wikidata || raw.wikipedia),
          km: distanceKm(query.near, { lat: p.lat, lng: p.lon }),
          food,
        });
      }

      // Notable places first (they have a Wikipedia/Wikidata entry), then nearest. Keep food to a few.
      const ranked = places.sort(
        (a, b) => Number(b.notable) - Number(a.notable) || a.km - b.km,
      );
      const foodPicks = ranked.filter((p) => p.food).slice(0, 3);
      const rest = ranked
        .filter((p) => !p.food)
        .slice(0, query.limit - foodPicks.length);
      return [...rest, ...foodPicks].map((entry) => entry.place);
    },
  };
}

export function geoapifyRouting(env: Env): TravelProviders["routing"] {
  return {
    name: NAME,
    async travelMinutes(from, to) {
      const url = new URL("https://api.geoapify.com/v1/routing");
      url.searchParams.set(
        "waypoints",
        `${from.lat},${from.lng}|${to.lat},${to.lng}`,
      );
      url.searchParams.set("mode", "drive");
      url.searchParams.set(
        "apiKey",
        requireKey(env, "GEOAPIFY_API_KEY", "Geoapify"),
      );
      const route = routeSchema.parse(
        await fetchJson("estimate_travel_time", "Geoapify", url),
      );
      return Math.round(route.features[0].properties.time / 60);
    },
  };
}
