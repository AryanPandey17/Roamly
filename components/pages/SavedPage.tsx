"use client"

import { Compass, Heart, Hotel, Plane, Trash2 } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockFlights, mockHotels, mockRecommendations } from "@/lib/mockData"
import type { SavedPlaceCategory } from "@/lib/types/persistence"
import { formatCurrency } from "@/lib/utils"

type SavedEntry = {
  id: string
  externalId: string
  category: SavedPlaceCategory
  title: string
  payload: Record<string, unknown>
}

function text(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === "string" ? value : ""
}

function amount(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === "number" ? value : null
}

function details(item: SavedEntry) {
  if (item.category === "flights") {
    return [text(item.payload, "from"), text(item.payload, "to"), text(item.payload, "duration")]
      .filter(Boolean)
      .join(" → ") || "Flight details saved"
  }
  if (item.category === "hotels") {
    const location = text(item.payload, "location")
    const rating = amount(item.payload, "rating")
    return [location, rating !== null ? `★ ${rating}` : ""].filter(Boolean).join(" · ") || "Accommodation saved"
  }
  return [text(item.payload, "category"), text(item.payload, "location")].filter(Boolean).join(" · ") || "Recommendation saved"
}

function price(item: SavedEntry) {
  const currency = text(item.payload, "currency") || "INR"
  if (item.category === "hotels") {
    const perNight = amount(item.payload, "pricePerNight")
    return perNight === null ? "" : `${formatCurrency(perNight, currency)}/night`
  }
  if (item.category === "flights") {
    const value = amount(item.payload, "price")
    return value === null ? "" : formatCurrency(value, currency)
  }
  return text(item.payload, "costLabel") || text(item.payload, "cost")
}

function demoEntries(): SavedEntry[] {
  return [
    ...mockFlights.map((flight) => ({
        id: flight.id,
        externalId: flight.id,
        category: "flights" as const,
        title: `${flight.airline} ${flight.flightNumber}`,
        payload: { from: flight.from, to: flight.to, duration: flight.duration, price: flight.price },
      })),
    ...mockHotels.map((hotel) => ({
        id: hotel.id,
        externalId: hotel.id,
        category: "hotels" as const,
        title: hotel.name,
        payload: { location: hotel.location, rating: hotel.rating, pricePerNight: hotel.pricePerNight },
      })),
    ...mockRecommendations.map((recommendation) => ({
        id: recommendation.id,
        externalId: recommendation.id,
        category: "recs" as const,
        title: recommendation.name,
        payload: {
          category: recommendation.category,
          location: recommendation.location,
          cost: recommendation.cost,
        },
      })),
  ]
}

const sectionConfig = {
  flights: { label: "Flights", icon: Plane },
  hotels: { label: "Hotels", icon: Hotel },
  recs: { label: "Recommendations", icon: Compass },
} satisfies Record<SavedPlaceCategory, { label: string; icon: typeof Plane }>

export default function SavedPage() {
  const { savedItems, savedPlaces, supabaseEnabled, syncError, toggleSaveItem, setActivePage } = useApp()
  const entries: SavedEntry[] = supabaseEnabled
    ? savedPlaces.map((place) => ({
        id: place.id,
        externalId: place.external_id,
        category: place.category,
        title: place.title || `Saved ${place.category.slice(0, -1)}`,
        payload: place.payload || {},
      }))
    : demoEntries().filter((entry) => savedItems[entry.category].includes(entry.externalId))
  const total = entries.length

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Favorites"
        title="Saved Places"
        description={`${total} item${total !== 1 ? "s" : ""} saved for your trips.`}
        icon={Heart}
      />

      {syncError && supabaseEnabled && <div className="demo-banner"><p>{syncError}</p></div>}

      {total === 0 ? (
        <div className="surface panel-pad" style={{ textAlign: "center" }}>
          <Heart style={{ width: "2.5rem", color: "#8892a4", margin: "0 auto .75rem" }} />
          <p style={{ color: "#687186", marginBottom: "1rem" }}>Save flights, hotels, and activities as you explore.</p>
          <button className="primary-button" onClick={() => setActivePage("local-recs")}>Browse recommendations</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {(Object.keys(sectionConfig) as SavedPlaceCategory[]).map((category) => {
            const sectionEntries = entries.filter((item) => item.category === category)
            if (!sectionEntries.length) return null
            const { label, icon: Icon } = sectionConfig[category]
            return (
              <section key={category}>
                <p className="section-title"><Icon /> {label}</p>
                <div className="surface">
                  {sectionEntries.map((item) => (
                    <div className="list-row" key={item.id}>
                      <div><h4>{item.title}</h4><p>{details(item)}</p></div>
                      <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                        {price(item) && <strong>{price(item)}</strong>}
                        <button
                          className="secondary-button"
                          style={{ padding: ".4rem" }}
                          onClick={() => void toggleSaveItem(category, item.externalId)}
                          aria-label={`Remove ${item.title}`}
                        >
                          <Trash2 style={{ width: ".85rem" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
