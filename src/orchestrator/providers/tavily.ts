// Web search from Tavily. Free plan: 1,000 credits a month; a basic search costs 1.

import { z } from "zod";
import type { TravelProviders } from "../ports";
import { fetchJson, requireKey } from "./http";

type Env = Record<string, string | undefined>;

const schema = z.object({
  results: z.array(z.object({ title: z.string(), url: z.string(), content: z.string().optional() })).default([]),
});

export function tavilySearch(env: Env): TravelProviders["search"] {
  return {
    name: "tavily",
    async search(query) {
      const raw = await fetchJson("web_search", "Tavily", "https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${requireKey(env, "TAVILY_API_KEY", "Tavily")}`,
        },
        body: JSON.stringify({ query, search_depth: "basic", max_results: 5 }),
      });
      return schema
        .parse(raw)
        .results.map((r) => ({ title: r.title, url: r.url, snippet: (r.content ?? "").slice(0, 700) }));
    },
  };
}
