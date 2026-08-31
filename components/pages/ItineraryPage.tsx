"use client"

import { useState } from "react"
import {
  Calendar,
  CheckCircle,
  Download,
  MapPin,
  Share2,
  Wallet,
} from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import {
  mockBudgetBreakdown,
  mockBudgetRemaining,
  mockBudgetTotal,
  mockDayPlans,
  mockMapPins,
} from "@/lib/mockData"
import { formatCurrency } from "@/lib/utils"

export default function ItineraryPage() {
  const { requirements, setActivePage } = useApp()
  const [activeDay, setActiveDay] = useState(1)
  const [mapView, setMapView] = useState<"full" | number>("full")
  const day = mockDayPlans.find((d) => d.day === activeDay) ?? mockDayPlans[0]

  return (
    <AppLayout maxWidth="max-w-6xl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Optimized itinerary</p>
          <h1>Your Optimized Tokyo Adventure</h1>
          <p>
            {requirements.from} → {requirements.to} · 5 days · {requirements.travelers} travelers ·{" "}
            Budget {formatCurrency(requirements.budget)} · <strong style={{ color: "#149d87" }}>AI Optimized</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button className="secondary-button"><Share2 /> Share</button>
          <button className="secondary-button"><Download /> Export</button>
          <button className="primary-button" onClick={() => alert("Trip booked! (Demo)")}>
            <CheckCircle /> Book Trip
          </button>
        </div>
      </div>

      <div className="content-grid">
        <div>
          {/* Summary cards */}
          <div className="content-grid-wide" style={{ marginBottom: "1.25rem" }}>
            {[
              { label: "Flights", value: "₹48,000", emoji: "✈️" },
              { label: "Hotel", value: "₹34,000", emoji: "🏨" },
              { label: "Food", value: "₹25,000", emoji: "🍜" },
              { label: "Activities", value: "₹20,000", emoji: "🎯" },
            ].map((item) => (
              <div className="surface panel-pad" key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem" }}>{item.emoji}</div>
                <p style={{ fontSize: ".72rem", color: "#687186", marginTop: ".35rem" }}>{item.label}</p>
                <strong style={{ fontSize: ".95rem", color: "#172033" }}>{item.value}</strong>
              </div>
            ))}
          </div>

          {/* Day tabs */}
          <div className="day-tabs">
            {mockDayPlans.map((d) => (
              <button
                key={d.day}
                type="button"
                className={`day-tab ${activeDay === d.day ? "is-active" : ""}`}
                onClick={() => { setActiveDay(d.day); setMapView(d.day) }}
              >
                Day {d.day}
              </button>
            ))}
          </div>

          <div className="surface panel-pad">
            <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #edf0f5" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 750, color: "#172033" }}>
                Day {day.day}: {day.theme}
              </h3>
            </div>
            {day.events.map((event) => (
              <div className="timeline-item" key={event.time + event.title}>
                <div className="timeline-time">{event.time}</div>
                <div className="timeline-body">
                  <h4>{event.icon} {event.title}</h4>
                  <p>{event.description}</p>
                  <div className="timeline-meta">
                    <span><MapPin style={{ width: ".7rem" }} /> {event.location}</span>
                    <span><Wallet style={{ width: ".7rem" }} /> {event.cost}</span>
                    <span><Calendar style={{ width: ".7rem" }} /> {event.travelTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button className="secondary-button" onClick={() => setActivePage("flights")}>View flights</button>
            <button className="secondary-button" onClick={() => setActivePage("accommodation")}>View hotels</button>
            <button className="secondary-button" onClick={() => setActivePage("local-recs")}>Local recs</button>
            <button className="secondary-button" onClick={() => setActivePage("budget-insights")}>Budget</button>
          </div>
        </div>

        <div>
          {/* Budget summary */}
          <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
            <p className="section-title">Trip budget</p>
            <table className="budget-table">
              <thead>
                <tr><th>Category</th><th>Cost</th></tr>
              </thead>
              <tbody>
                {mockBudgetBreakdown.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  <td>{formatCurrency(mockBudgetTotal)}</td>
                </tr>
                <tr className="remain">
                  <td>Remaining</td>
                  <td>{formatCurrency(mockBudgetRemaining)}</td>
                </tr>
              </tbody>
            </table>
            <div className="health-banner">
              <strong>Excellent budget health</strong>
              <p>Your trip is currently {formatCurrency(mockBudgetRemaining)} under budget.</p>
            </div>
          </div>

          {/* Map */}
          <div className="surface panel-pad">
            <p className="section-title">Trip map</p>
            <div className="tab-bar" style={{ marginBottom: ".75rem" }}>
              <button type="button" className={`tab-btn ${mapView === "full" ? "is-active" : ""}`} onClick={() => setMapView("full")}>Full trip</button>
              {mockDayPlans.map((d) => (
                <button key={d.day} type="button" className={`tab-btn ${mapView === d.day ? "is-active" : ""}`} onClick={() => setMapView(d.day)}>Day {d.day}</button>
              ))}
            </div>
            <div className="map-placeholder">
              <svg className="map-route" viewBox="0 0 400 200" preserveAspectRatio="none">
                <path d="M280,30 L140,90 L220,100 L80,140" fill="none" stroke="#5b5ce2" strokeWidth="2" strokeDasharray="6 4" />
              </svg>
              {mockMapPins.map((pin) => (
                <div className="map-pin" key={pin.id} style={{ top: pin.top, left: pin.left }}>
                  <i>{pin.emoji}</i>
                  {pin.label}
                </div>
              ))}
            </div>
            <p style={{ fontSize: ".72rem", color: "#8892a4", marginTop: ".65rem", textAlign: "center" }}>
              Map placeholder — connect Google Maps API for live routes
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
