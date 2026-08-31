"use client"

import { useMemo, useState } from "react"
import { Briefcase, Calendar, Copy, Plus, Search, Trash2, Wallet } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockTrips } from "@/lib/mockData"

type Trip = (typeof mockTrips)[number]

export default function MyTripsPage() {
  const { setActivePage } = useApp()
  const [trips, setTrips] = useState<Trip[]>(mockTrips)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"date" | "budget">("date")
  const [filter, setFilter] = useState<"all" | Trip["status"]>("all")

  const displayed = useMemo(() => {
    let list = [...trips]
    if (filter !== "all") list = list.filter((t) => t.status === filter)
    if (search) list = list.filter((t) => t.destination.toLowerCase().includes(search.toLowerCase()) || t.location.toLowerCase().includes(search.toLowerCase()))
    list.sort((a, b) => sort === "budget" ? b.budget - a.budget : a.dates.localeCompare(b.dates))
    return list
  }, [trips, search, sort, filter])

  const badgeClass = (status: Trip["status"]) =>
    status === "Ready" ? "ready" : status === "Completed" ? "completed" : status === "Draft" ? "draft" : "progress"

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Your trips"
        title="My Trips"
        description="Search, filter, and manage all your planned adventures."
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
              <button className="primary-button" style={{ flex: 1 }} onClick={() => setActivePage("itinerary")}>View itinerary</button>
              <button className="secondary-button" title="Duplicate" onClick={() => setTrips((prev) => [...prev, { ...trip, id: `${trip.id}-copy`, destination: `${trip.destination} (Copy)`, status: "Draft" }])}>
                <Copy />
              </button>
              <button className="secondary-button" title="Delete" onClick={() => setTrips((prev) => prev.filter((t) => t.id !== trip.id))}>
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="surface panel-pad" style={{ textAlign: "center" }}>
          <Search style={{ width: "2rem", color: "#8892a4", margin: "0 auto .75rem" }} />
          <p style={{ color: "#687186" }}>No trips match your search.</p>
        </div>
      )}
    </AppLayout>
  )
}
