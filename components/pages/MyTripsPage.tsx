"use client"

import { useMemo, useState } from "react"
import { Briefcase, Calendar, Plus, Search, Trash2, Wallet } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockTrips } from "@/lib/mockData"
import { apiGet, apiSend } from "@/lib/api"
import type { TripRecord } from "@/lib/types/trip"
import { viewTripCards } from "@/lib/trip/view"

export default function MyTripsPage() {
  const { setActivePage, trips, setActiveTrip, accessToken, supabaseEnabled, refreshTrips, activeTrip, syncError } = useApp()
  const live = viewTripCards(trips)
  const source = supabaseEnabled ? live : mockTrips
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"date" | "budget">("date")
  const [filter, setFilter] = useState<"all" | "Ready" | "Draft" | "Completed">("all")
  const [hidden, setHidden] = useState<string[]>([])

  const displayed = useMemo(() => {
    let list = source.filter((t) => !hidden.includes(t.id))
    if (filter !== "all") list = list.filter((t) => t.status === filter)
    if (search) {
      list = list.filter(
        (t) =>
          t.destination.toLowerCase().includes(search.toLowerCase()) ||
          t.location.toLowerCase().includes(search.toLowerCase())
      )
    }
    list.sort((a, b) => (sort === "budget" ? b.budget - a.budget : a.dates.localeCompare(b.dates)))
    return list
  }, [source, search, sort, filter, hidden])

  const badgeClass = (status: string) =>
    status === "Ready" ? "ready" : status === "Completed" ? "completed" : status === "Draft" ? "draft" : "progress"

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Your trips"
        title="My Trips"
        description={supabaseEnabled ? "Synced from Supabase when you are signed in." : "Mock trips — configure Supabase to persist real plans."}
        icon={Briefcase}
        action={
          <button className="primary-button" onClick={() => setActivePage("plan-trip")}>
            <Plus /> Plan New Trip
          </button>
        }
      />

      <div className="search-bar">
        <input placeholder="Search trips..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All statuses</option>
          <option value="Ready">Ready</option>
          <option value="Draft">Draft</option>
          <option value="Completed">Completed</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="date">Sort by date</option>
          <option value="budget">Sort by budget</option>
        </select>
      </div>

      {syncError && supabaseEnabled && <div className="demo-banner" style={{ marginBottom: "1rem" }}><p>{syncError}</p></div>}

      <div className="trip-card-grid">
        {displayed.map((trip) => (
          <div className="trip-card-item" key={trip.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="emoji">{trip.image}</span>
              <span className={`badge ${badgeClass(trip.status)}`}>{trip.status}</span>
            </div>
            <h3>{trip.destination}</h3>
            <div className="trip-card-meta">
              <span><Calendar /> {trip.dates} · {trip.days} days</span>
              <span><Wallet /> ₹{trip.budget.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "flex", gap: ".35rem", marginTop: ".85rem", flexWrap: "wrap" }}>
              <button
                className="primary-button"
                style={{ flex: 1 }}
                onClick={async () => {
                  let full = trips.find((t) => t.id === trip.id) || activeTrip
                  if (supabaseEnabled && accessToken) {
                    try {
                      const data = await apiGet<{ trip: TripRecord | null }>(`/api/trips/${trip.id}`, accessToken)
                      if (data.trip) full = data.trip
                    } catch {
                      // The list entry already has enough itinerary data for a graceful fallback.
                    }
                  }
                  if (full) setActiveTrip(full)
                  setActivePage("itinerary")
                }}
              >
                View itinerary
              </button>
              <button
                className="secondary-button"
                title="Delete"
                onClick={async () => {
                  setHidden((prev) => [...prev, trip.id])
                  if (supabaseEnabled && accessToken) {
                    await apiSend(`/api/trips/${trip.id}`, accessToken, "DELETE")
                    await refreshTrips()
                  }
                }}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="surface panel-pad" style={{ textAlign: "center" }}>
          <Search style={{ width: "2rem", color: "#8892a4", margin: "0 auto .75rem" }} />
          <p style={{ color: "#687186" }}>No trips yet. Plan one or run demo mode.</p>
        </div>
      )}
    </AppLayout>
  )
}
