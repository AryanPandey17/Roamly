"use client"

import { useState } from "react"
import { Calendar, CheckCircle, Download, MapPin, Share2, Wallet } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import { useApp } from "@/context/AppContext"
import { mockMapPins } from "@/lib/mockData"
import { viewBudget, viewDays } from "@/lib/trip/view"
import { formatCurrency } from "@/lib/utils"

export default function ItineraryPage() {
  const { requirements, setActivePage, activeTrip, providers } = useApp()
  const [activeDay, setActiveDay] = useState(1)
  const [mapView, setMapView] = useState<"full" | number>("full")
  const days = viewDays(activeTrip)
  const budget = viewBudget(activeTrip)
  const day = days.find((d) => d.day === activeDay) ?? days[0]
  const itinerary = activeTrip?.finalItinerary
  const title = itinerary ? `Your optimized ${itinerary.destination} adventure` : "Your Optimized Tokyo Adventure"
  const currency = itinerary?.currency || requirements.currency || "INR"

  return (
    <AppLayout maxWidth="max-w-6xl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Optimized itinerary</p>
          <h1>{title}</h1>
          <p>
            {itinerary ? `${itinerary.dates.start} → ${itinerary.dates.end}` : `${requirements.from} → ${requirements.to}`}
            {" · "}
            {activeTrip?.travelerCount ?? requirements.travelers} travelers · Budget{" "}
            {formatCurrency(itinerary?.budgetTotal ?? requirements.budget, currency)}
            {" · "}
            <strong style={{ color: "#149d87" }}>{itinerary?.notes?.includes("Compromise") ? "Compromise plan" : "AI Optimized"}</strong>
          </p>
          {itinerary?.assumptions?.length ? (
            <p style={{ fontSize: ".78rem", marginTop: ".35rem" }}>Assumptions: {itinerary.assumptions.join(" · ")}</p>
          ) : null}
          {!providers.mistral && !providers.gemini && (
            <p style={{ fontSize: ".75rem", color: "#a46a18", marginTop: ".35rem" }}>Showing catalog/demo data until MISTRAL_API_KEY or GEMINI_API_KEY is set.</p>
          )}
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button className="secondary-button"><Share2 /> Share</button>
          <button className="secondary-button"><Download /> Export</button>
          <button className="primary-button" onClick={() => alert("Trip booked! (Prototype)")}>
            <CheckCircle /> Book Trip
          </button>
        </div>
      </div>

      <div className="content-grid">
        <div>
          <div className="content-grid-wide" style={{ marginBottom: "1.25rem" }}>
            {budget.rows.map((item) => (
              <div className="surface panel-pad" key={item.category} style={{ textAlign: "center" }}>
                <p style={{ fontSize: ".72rem", color: "#687186" }}>{item.category}</p>
                <strong style={{ fontSize: ".95rem", color: "#172033" }}>{formatCurrency(item.amount, currency)}</strong>
              </div>
            ))}
          </div>

          <div className="day-tabs">
            {days.map((d) => (
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
            {day.events.length === 0 && <p style={{ color: "#687186", fontSize: ".85rem" }}>Transit and check-in only.</p>}
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

          <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button className="secondary-button" onClick={() => setActivePage("flights")}>View flights</button>
            <button className="secondary-button" onClick={() => setActivePage("accommodation")}>View hotels</button>
            <button className="secondary-button" onClick={() => setActivePage("local-recs")}>Local recs</button>
            <button className="secondary-button" onClick={() => setActivePage("budget-insights")}>Budget</button>
            <button className="secondary-button" onClick={() => setActivePage("negotiations")}>Negotiation log</button>
          </div>
        </div>

        <div>
          <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
            <p className="section-title">Trip budget</p>
            <table className="budget-table">
              <thead>
                <tr><th>Category</th><th>Cost</th></tr>
              </thead>
              <tbody>
                {budget.rows.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{formatCurrency(row.amount, currency)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  <td>{formatCurrency(budget.spent, currency)}</td>
                </tr>
                <tr className="remain">
                  <td>Remaining</td>
                  <td>{formatCurrency(budget.remaining, currency)}</td>
                </tr>
              </tbody>
            </table>
            <div className="health-banner">
              <strong>Budget health: {budget.health}</strong>
              <p>{itinerary?.notes || `Your trip is currently ${formatCurrency(budget.remaining, currency)} relative to budget.`}</p>
            </div>
          </div>

          <div className="surface panel-pad">
            <p className="section-title">Trip map</p>
            <div className="tab-bar" style={{ marginBottom: ".75rem" }}>
              <button type="button" className={`tab-btn ${mapView === "full" ? "is-active" : ""}`} onClick={() => setMapView("full")}>Full trip</button>
              {days.map((d) => (
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
              {providers.maps ? "Google Maps key detected — live overlays can be enabled next." : "Map placeholder — add GOOGLE_MAPS_API_KEY to enable live routes."}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
