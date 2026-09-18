"use client"

import {
  Calendar,
  Clock,
  Globe2,
  MapPin,
  Navigation,
  Plus,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockTrips } from "@/lib/mockData"
import { viewTripCards } from "@/lib/trip/view"

const aiActivities = [
  { agent: "Logistics Agent", action: "analyzed 12 flight options for Tokyo trip.", time: "10 mins ago" },
  { agent: "Budget Agent", action: "rejected Sakura Grand Hotel — exceeded budget by ₹18,000.", time: "1 hour ago" },
  { agent: "Recommendations Agent", action: "suggested 8 attractions near Shibuya.", time: "2 hours ago" },
  { agent: "Supervisor Agent", action: "finalized optimized Tokyo itinerary.", time: "3 hours ago" },
]

export default function DashboardPage() {
  const { setActivePage, startDemo, user, trips, logs, supabaseEnabled, providers, setActiveTrip } = useApp()
  const live = viewTripCards(trips)
  const catalog = supabaseEnabled ? live : mockTrips
  const upcoming = catalog.filter((t) => t.status !== "Completed")
  const recent = catalog.filter((t) => t.status === "Completed")
  const activity = logs.length
    ? logs.slice(-4).reverse().map((l) => ({ agent: `${l.agent} Agent`, action: l.message, time: l.timestamp }))
    : aiActivities

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Overview"
        title={`Where do you want to travel next${user?.name ? `, ${user.name.split(" ")[0]}` : ""}?`}
        description={
          providers.gemini
            ? "Live Gemini agents are enabled. Plan a trip to watch the negotiation loop."
            : "Add GEMINI_API_KEY for live agents. Demo Mode still runs the catalog simulation."
        }
        action={
          <button className="primary-button" onClick={startDemo}>
            <Zap /> Demo Mode
          </button>
        }
      />

      <div className="stats-grid">
        {[
          { label: "Trips Planned", value: "6", icon: Globe2, cls: "purple" },
          { label: "Countries Explored", value: "4", icon: MapPin, cls: "green" },
          { label: "Budget Managed", value: "₹7.6L", icon: TrendingUp, cls: "amber" },
          { label: "Avg. Duration", value: "5.2 days", icon: Clock, cls: "blue" },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div className="stat-card" key={label}>
            <div>
              <p>{label}</p>
              <strong>{value}</strong>
            </div>
            <span className={`stat-icon ${cls}`}><Icon /></span>
          </div>
        ))}
      </div>

      <div className="hero-banner">
        <h2>Plan a new trip in minutes</h2>
        <p>
          Tell our AI agents where you want to go. They&apos;ll compare flights, hotels, and activities —
          then negotiate until everything fits your budget.
        </p>
        <div className="hero-banner-actions">
          <button className="primary-button" onClick={() => setActivePage("plan-trip")}>
            <Plus /> Plan New Trip
          </button>
          <button className="secondary-button" onClick={() => setActivePage("about")}>
            See how it works
          </button>
        </div>
      </div>

      <div className="content-grid">
        <div>
          <p className="section-title"><Navigation /> Upcoming Trips</p>
          <div className="trip-card-grid">
            {upcoming.map((trip) => (
              <button
                type="button"
                key={trip.id}
                className="trip-card-item"
                onClick={() => {
                  const full = trips.find((t) => t.id === trip.id)
                  if (full) setActiveTrip(full)
                  setActivePage("itinerary")
                }}
                style={{ textAlign: "left", width: "100%" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <span className="emoji">{trip.image}</span>
                  <span className={`badge ${trip.status === "Ready" ? "ready" : "draft"}`}>{trip.status}</span>
                </div>
                <h3>{trip.location}</h3>
                <div className="trip-card-meta">
                  <span><Calendar /> {trip.dates}</span>
                  <span><Wallet /> ₹{trip.budget.toLocaleString("en-IN")}</span>
                </div>
              </button>
            ))}
          </div>

          <p className="section-title" style={{ marginTop: "1.75rem" }}>Recent Trips</p>
          <div className="surface">
            {recent.map((trip) => (
              <div className="list-row" key={trip.id}>
                <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{trip.image}</span>
                  <div>
                    <h4>{trip.destination}</h4>
                    <p>{trip.dates}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <span style={{ fontSize: ".78rem", color: "#687186" }}>₹{trip.budget.toLocaleString("en-IN")}</span>
                  <span className="badge completed">{trip.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface activity-panel">
          <h3><Zap /> AI Activity</h3>
              {activity.map((act) => (
            <div className="activity-line" key={act.time + act.agent}>
              <div>
                <strong>{act.agent}</strong>
                <time>{act.time}</time>
                <p>{act.action}</p>
              </div>
            </div>
          ))}
          <button className="text-button" style={{ marginTop: ".75rem" }} onClick={() => setActivePage("agents")}>
            View all agents →
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
