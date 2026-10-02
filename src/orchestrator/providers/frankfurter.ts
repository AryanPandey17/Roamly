// Currency rates from Frankfurter (central bank reference rates). Free, no key, no quota.

import { z } from "zod";
import type { TravelProviders } from "../ports";
import { fetchJson } from "./http";

const schema = z.object({ date: z.string().optional(), rates: z.record(z.string(), z.number()) });

export const frankfurterFx: TravelProviders["fx"] = {
  name: "frankfurter",
  async rate(from, to) {
    const a = from.toUpperCase();
    const b = to.toUpperCase();
    if (a === b) return { rate: 1, asOf: new Date().toISOString().slice(0, 10) };

    const url = new URL("https://api.frankfurter.dev/v1/latest");
    url.searchParams.set("base", a);
    url.searchParams.set("symbols", b);
    const parsed = schema.parse(await fetchJson("convert_currency", "Frankfurter", url));
    const rate = parsed.rates[b];
    if (!rate) throw new Error(`Frankfurter has no rate for ${a} to ${b}.`);
    return { rate, asOf: parsed.date ?? new Date().toISOString().slice(0, 10) };
  },
};
