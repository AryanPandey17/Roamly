# Roamly — External API Research (Phase 5)

Researched 2026-10-03 from each provider's own pricing, terms and documentation pages. Items I could not confirm are marked **unverified**. Nothing is wired yet; this document is for approval.

Constraints applied: free tiers only, no credit card where possible, local project, real data instead of sample data.

---

## 1. Recommendation at a glance

| Category | Recommended | Free allowance | Booking | Key needed |
|---|---|---|---|---|
| Flights | **SerpApi Google Flights** | 250 searches/month, 50/hour (shared with hotels) | Search + price + link to Google Flights | `SERPAPI_API_KEY` |
| Flights, second source | **Travelpayouts Data API** | Free, rate-limited | Cached prices + link to Aviasales | `TRAVELPAYOUTS_TOKEN` (optional) |
| Hotels | **SerpApi Google Hotels** | Same 250/month pool | Search + price + link to the property | same key |
| Places and activities | **Geoapify Places** | 3,000 credits/day, 5 requests/second | Not applicable | `GEOAPIFY_API_KEY` |
| Routing and travel time | **Geoapify Routing** | Same 3,000/day pool | — | same key |
| Geocoding | **Open-Meteo Geocoding** (already wired) | 10,000 calls/day | — | none |
| Weather | **Open-Meteo Forecast** | 10,000 calls/day | — | none |
| Currency | **Frankfurter** | No quota | — | none |
| Web context and cost estimates | **Tavily** | 1,000 credits/month | — | `TAVILY_API_KEY` |
| Map tiles | **OpenStreetMap standard tiles** | Fair use, no guarantee | — | none |
| Map library | Leaflet 1.9.4 + react-leaflet 5.0.0 | — | — | — |
| Actions | Built in: share link, calendar file, markdown and print export | — | — | none |

Three keys to create: SerpApi, Geoapify, Tavily. None asks for a card on the free plan as far as the pricing pages state.

**Real booking is not realistic on a student budget.** Every option that can issue a real ticket needs business verification, per-order fees, or an enterprise contract. The design is search, price and deep link, behind interfaces that let a booking provider be added later.

---

## 2. Flights

| Option | Free tier | Data | Booking | Auth | Verdict |
|---|---|---|---|---|---|
| **Amadeus Self-Service** | — | — | — | — | **Gone.** New registrations stopped in March 2026 and the portal was decommissioned on 17 July 2026. Only the Enterprise portal remains |
| **Duffel** | Search is free up to a 1,500:1 search-to-book ratio, then $0.005 per search. $3 per order | Live airline offers in live mode. Test mode uses a fictional airline | Yes, real tickets, in live mode | Token. Live mode access terms not stated on the pricing page (**unverified**) | Best path to real booking later. Test mode would show invented flights, which is what we are removing |
| **Kiwi Tequila** | — | — | — | — | Could not confirm that self-service sign-up is open (**unverified**). Not relied on |
| **Travelpayouts / Aviasales Data API** | Free with an account token. One endpoint documents 10 requests/second | Prices cached from real user searches, kept 7 days. Strong on popular routes, thin on rare ones. Includes dates, airline, stops, duration | No. Link opens the search on Aviasales | Token from the profile page | Good second source. Cached, so a route can come back empty |
| **SerpApi Google Flights** | 250 searches/month, 50/hour. Failed and cached searches are not counted | Live Google Flights results: price, airline, flight numbers, times, duration, layovers | No. Link to Google Flights. A booking token exists for listing booking options | API key | **Recommended.** Real current prices for any route. Limited by the monthly pool |

Notes on SerpApi:

- A round-trip search returns outbound options priced for the whole round trip. Return-leg details need a second request per chosen flight. We will make that second call only for the flight that ends up in the itinerary.
- It needs airport codes. City to IATA lookup is planned through Geoapify's airport search (**unverified** that the `iata` tag is always present; Travelpayouts' autocomplete is the fallback).
- SerpApi works by reading Google's result pages. It advertises a "U.S. Legal Shield" on all plans. Fine for a student project; worth knowing if this ever becomes commercial.

**Decision:** `FlightProvider` = SerpApi, falling back to Travelpayouts when SerpApi is out of quota or returns nothing.

---

## 3. Hotels

| Option | Free tier | Data | Booking | Verdict |
|---|---|---|---|---|
| **Amadeus hotel endpoints** | — | — | — | Gone with the Self-Service portal |
| **Hotellook / Travelpayouts** | — | — | — | **Gone.** Closed 20 October 2025; the API returns errors and Travelpayouts lists no replacement |
| **LiteAPI (Nuitée)** | Rates, prebook and book are documented as free within a reasonable search-to-book ratio. Places endpoints cost $0.01 per request | Real hotel rates | Yes, real bookings | Sandbox details and rate limits not confirmed (**unverified**). Best candidate if real hotel booking is wanted later |
| **Duffel Stays** | Commission-based | Real rates | Yes | Same access question as Duffel flights |
| **SerpApi Google Hotels** | Same 250/month pool | Live Google Hotels: name, coordinates, nightly and total rate, rating, amenities, images, link. Supports `max_price`, `min_price`, `sort_by`, `rating` | No. Link to the property | **Recommended.** `max_price` maps directly onto the Budget agent's nightly ceiling |

**Decision:** `HotelProvider` = SerpApi Google Hotels.

---

## 4. Places, food and activities

| Option | Free tier | Data | Gaps | Verdict |
|---|---|---|---|---|
| **Geoapify Places** | 3,000 credits/day, 5 requests/second, commercial use allowed, attribution required | OpenStreetMap-based places by category (`tourism`, `entertainment.museum`, `leisure.park`, `catering.restaurant` and more) within a radius. Name, coordinates, address, categories. Results may be cached and stored | No ratings. No prices | **Recommended** for coverage and quota |
| **OpenTripMap** | Free key | Attractions from OSM, Wikidata and Wikipedia with a popularity score and descriptions | No prices. Could not confirm current limits or service status (**unverified**) | Not relied on |
| **Overpass / OSM directly** | Free, shared public servers | Raw OSM | Query language, slow public instances, no ranking | Geoapify gives the same data with less work |
| **Foursquare Places** | Up to 10,000 free calls on Pro endpoints; pay as you go after | Rich venue data | Ratings, photos and tips sit on paid Premium endpoints | The useful fields are the paid ones |
| **SerpApi Google Maps** | Same 250/month pool | Rating, review count, type, coordinates | Price is a level like `$$` for restaurants, not ticket prices | Good ratings, but spends the scarce pool. Optional upgrade |
| **Viator Partner API** | Affiliate "basic access" tier exists | Real tour prices | Access terms and the basic tier's endpoints not confirmed (**unverified**) | Revisit if tours with real prices are wanted |

**The honest gap: no free API gives attraction entry prices or city-level daily costs.** Two things the Budget agent needs therefore have no direct source:

1. **Activity prices.** Proposal: a place is free when OpenStreetMap tags it `fee=no` or it is a category that is free by nature (parks, viewpoints, markets, streets). For the rest, one Tavily search per destination plus one `fast` model call extracts typical entry fees for the candidate list. These are stored as **estimates** with their source link, shown with an "est." label, and counted in the budget.
2. **Food and local transport per day.** Proposal: one Tavily search ("daily food and local transport cost in X for a traveller") and one model call extract a per-person daily figure for the user's budget style. Labelled an estimate with its source, cached per destination for 30 days.

If the extraction fails, the run says so and pauses on that step instead of inventing a number.

**Decision:** `PlacesProvider` = Geoapify. Prices and daily costs = web-grounded estimates via Tavily, clearly labelled.

---

## 5. Maps

| Need | Options | Decision |
|---|---|---|
| Library | Leaflet 1.9.4 with `react-leaflet` 5.0.0 (requires React 19, which we have) | Use both. Leaflet touches `window`, so the map component loads client-side only (`next/dynamic` with `ssr: false`) |
| Tiles | **OSM standard tiles:** free, attribution required, valid Referer, no bulk download, no availability guarantee. **Geoapify tiles:** same key, counted against daily credits. **MapTiler / Stadia:** free tiers, key required (Stadia terms page blocked my fetch, **unverified**) | OSM tiles for local use, with attribution. Tile URL in an env variable so a keyed provider can replace it |
| Geocoding | **Nominatim:** 1 request/second maximum, no autocomplete, must cache. **Geoapify:** in the daily credits. **Open-Meteo:** no key, 10,000/day | Keep Open-Meteo (already wired and working) |
| Routing | **OSRM demo server:** no key, driving only, no guarantee. **OpenRouteService:** key required; free limits not confirmed (**unverified**). **Geoapify Routing:** same key and credit pool | Geoapify Routing for airport-to-centre time and day routes |
| Clustering | `react-leaflet-cluster` 4.1.3 (built for react-leaflet 5) | Use it |
| Day routes | Polyline through the day's items in order | Straight segments by default; road geometry from Geoapify when credits allow |

---

## 6. Weather and currency

| Need | Choice | Notes |
|---|---|---|
| Weather | **Open-Meteo Forecast** | No key. 10,000 calls/day, 5,000/hour, 600/minute. Free tier is for non-commercial use, attribution under CC BY 4.0. Forecast horizon to confirm during wiring; trips beyond it show no forecast instead of a guess |
| Currency | **Frankfurter** (`api.frankfurter.dev`) | No key, no quota, daily rates from central banks, 223 currencies. Used to convert every price to the trip currency before any sum. INR support to confirm on first call |

---

## 7. MCP and actions

`@langchain/mcp-adapters` 2.0.0 can attach MCP servers as agent tools. I evaluated what that would buy us:

| Action | MCP route | Risk | Decision |
|---|---|---|---|
| Add itinerary to calendar | Google Calendar MCP server | Needs the user's Google OAuth with write access to their calendar. An agent with that tool could create or change events on its own | **No MCP.** Generate a standard `.ics` file the user downloads and opens in any calendar |
| Email the plan | Gmail or SMTP MCP server | Sends mail as the user. A prompt-injected page in search results could trigger it | **No MCP.** A `mailto:` link and the share link cover it |
| Share link | — | Low | Built in. Random token, revocable, read-only page |
| Export | — | Low | Built in. Markdown download and a print-friendly page for PDF |
| Web search | Tavily MCP server | Low | Call Tavily's REST API directly. Fewer moving parts than a second process |
| Maps and places | Google Maps MCP | Paid API behind it | Not needed |

**Rule adopted:** agents get read-only tools (search, price, geocode, route, weather, convert). Anything that sends, publishes or writes outside Roamly is plain server code that runs only on an explicit user click, for that user's own trip. No agent holds an action tool, so there is nothing for injected text in a search result to trigger.

MCP stays available for later through the same tool interface if a real need appears.

---

## 8. Provider abstraction

The interfaces already exist in `src/orchestrator/ports.ts` and the agents only know these. Phase 5 adds real implementations and two new interfaces.

```ts
interface FlightProvider   { name: string; search(q: FlightSearch): Promise<FlightOption[]> }
interface HotelProvider    { name: string; search(q: HotelSearch): Promise<HotelOption[]> }
interface PlacesProvider   { name: string; search(q: PlaceSearch): Promise<PlaceOption[]> }
interface RoutingProvider  { name: string; travelMinutes(from, to): Promise<number> }
interface GeocodingProvider{ name: string; geocode(query: string): Promise<Place | null> }
interface CostProvider     { name: string; dailyEstimates(input): Promise<Estimates> }
// new
interface WeatherProvider  { name: string; daily(lat, lng, start, end): Promise<DailyWeather[]> }
interface FxProvider       { name: string; rate(from: string, to: string): Promise<{ rate: number; asOf: string }> }
interface SearchProvider   { name: string; search(query: string): Promise<{ title: string; snippet: string; url: string }[]> }
```

Files: one adapter per provider under `src/orchestrator/providers/` (`serpapi-flights.ts`, `serpapi-hotels.ts`, `travelpayouts.ts`, `geoapify.ts`, `open-meteo.ts`, `frankfurter.ts`, `tavily.ts`). `dev.ts` is deleted. Each adapter validates the provider's response with Zod and maps it to our option types, so a changed response shape fails loudly at the edge.

Every option gains two fields: `priceIsEstimate` and `sourceUrl`.

## 9. Caching

Stored in the existing `tool_cache` table, keyed by tool name plus a hash of the normalized input.

| Tool | Time to live | Why |
|---|---|---|
| Flight search | 6 hours | Prices move; protects the 250/month pool during a negotiation and on re-runs |
| Hotel search | 6 hours | Same |
| Places | 7 days | POIs change slowly; Geoapify allows storing results |
| Activity price estimates | 30 days | Entry fees change rarely |
| Daily cost estimates | 30 days | Same |
| Geocoding | 90 days | Cities do not move |
| Routing | 30 days | |
| Weather | 3 hours | |
| FX rate | 12 hours | Updated daily at source |

Revisions under a price ceiling filter the cached result in code first and only search again when nothing cached fits. A typical trip should cost 2 SerpApi searches the first time and 0 on a repeat.

## 10. Error handling

| Situation | Behaviour |
|---|---|
| Timeout or 5xx | One retry, then the next provider for that category if one exists |
| 429 or quota spent | No retry. Next provider, else the run pauses with "search quota reached" and can be resumed |
| Empty result | Returned to the agent as an empty list. For flights and stays the run ends with a clear "nothing found for these dates" |
| Response fails validation | Treated as a provider error and logged with the provider's name |
| Missing API key | Provider is skipped. If a required category has no provider, the app says which key is missing instead of falling back to sample data |

Each call writes a `tool_call_logs` row with provider, latency, cache hit and status.

## 11. Tool schemas

The agent-facing tools keep their current Zod input schemas (`search_flights`, `estimate_travel_time`, `search_hotels`, `search_places`). Additions:

| Tool | Owner | Input | Output |
|---|---|---|---|
| `get_weather` | Recommendations | `{}` (uses the trip's place and dates) | Daily high, low, rain chance |
| `web_search` | Recommendations | `{ query: string }` | Title, snippet, URL. Context only, never a price source for a specific option |

Currency conversion and cost estimates are not model tools. They run in code inside the provider layer and the Budget node.

---

## 12. What I need from you

1. **Approval of this stack**, or changes.
2. **Three free keys** added to `.env`: `SERPAPI_API_KEY`, `GEOAPIFY_API_KEY`, `TAVILY_API_KEY`. Optional: `TRAVELPAYOUTS_TOKEN`.
3. **A decision on estimates.** Are web-grounded, labelled estimates acceptable for activity prices and daily food and transport? The alternative is to show activities without prices and leave them out of the budget.
4. **A decision on place ratings.** Geoapify has none. Options: rank by interest match and popularity signals only (free, generous quota), or spend one extra SerpApi search per trip on Google Maps ratings (about 80 trips a month instead of 125).

## 13. Sources

- Amadeus shutdown: https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers
- Duffel pricing: https://duffel.com/pricing
- Aviasales Data API: https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API
- Hotellook closure: https://support.travelpayouts.com/hc/en-us/articles/29534131568530-FAQ-on-the-closure-of-Hotellook
- SerpApi pricing, Google Flights, Google Hotels, Google Maps: https://serpapi.com/pricing, https://serpapi.com/google-flights-api, https://serpapi.com/google-hotels-api, https://serpapi.com/google-maps-api
- LiteAPI pricing: https://docs.liteapi.travel/reference/api-pricing-usage-costs
- Geoapify pricing and Places: https://www.geoapify.com/pricing/, https://apidocs.geoapify.com/docs/places/
- Foursquare pricing: https://foursquare.com/pricing/
- Tavily credits: https://docs.tavily.com/documentation/api-credits
- Open-Meteo terms: https://open-meteo.com/en/terms
- Frankfurter: https://frankfurter.dev/
- OSM tile policy: https://operations.osmfoundation.org/policies/tiles/
- Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/
- Package versions: npm registry, 2026-10-03
