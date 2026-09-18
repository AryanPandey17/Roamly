"use client"

import { useState } from "react"
import { Check, Heart, Hotel, Star } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { viewHotels } from "@/lib/trip/view"
import { formatCurrency } from "@/lib/utils"

export default function AccommodationPage() {
  const { savedItems, toggleSaveItem, activeTrip } = useApp()
  const hotels = viewHotels(activeTrip)
  const [selected, setSelected] = useState(hotels[0]?.id ?? "hotel-1")
  const [compareOpen, setCompareOpen] = useState(false)

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Recommendations agent"
        title="Accommodation"
        description="Hotels ranked by location, reviews, and budget fit."
        icon={Hotel}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
        {hotels.map((hotel) => (
          <div className="item-card" key={hotel.id}>
            <div className="item-card-header">
              <div style={{ display: "flex", gap: ".75rem" }}>
                <span style={{ fontSize: "2.5rem" }}>{hotel.image || "🏨"}</span>
                <div>
                  <h3>{hotel.name}</h3>
                  <p style={{ fontSize: ".75rem", color: "#687186", marginTop: ".2rem" }}>{hotel.location}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: ".25rem", marginTop: ".35rem", fontSize: ".78rem" }}>
                    <Star style={{ width: ".85rem", color: "#c78320", fill: "#c78320" }} />
                    {hotel.rating} · {hotel.distance}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: ".35rem", alignItems: "center" }}>
                {hotel.notes && <span className="badge ready">Proposed</span>}
                <button
                  className="secondary-button"
                  style={{ padding: ".45rem" }}
                  onClick={() => void toggleSaveItem("hotels", hotel.id, hotel, hotel.name)}
                >
                  <Heart style={{ width: ".9rem", fill: savedItems.hotels.includes(hotel.id) ? "#e05f7a" : "none", color: savedItems.hotels.includes(hotel.id) ? "#e05f7a" : undefined }} />
                </button>
              </div>
            </div>

            <div className="chip-grid">
              {hotel.amenities?.map((a) => <span key={a} className="chip">{a}</span>)}
            </div>

            <div className="item-card-footer">
              <div>
                <span style={{ fontSize: ".72rem", color: "#8892a4" }}>{formatCurrency(hotel.pricePerNight)}/night · {formatCurrency(hotel.totalPrice)} total</span>
                <div className="price-tag">{formatCurrency(hotel.totalPrice)}</div>
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button className="secondary-button" onClick={() => setCompareOpen(true)}>Compare</button>
                <button className={selected === hotel.id ? "secondary-button" : "primary-button"} onClick={() => setSelected(hotel.id)}>
                  {selected === hotel.id ? <><Check /> Selected</> : "Select hotel"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {compareOpen && (
        <div className="surface panel-pad" style={{ marginTop: "1rem" }}>
          <p className="section-title">Hotel comparison</p>
          <table className="budget-table">
            <thead><tr><th>Hotel</th><th>Rating</th><th>Night</th><th>Total</th></tr></thead>
            <tbody>
              {hotels.map((h) => (
                <tr key={h.id}><td>{h.name}</td><td>{h.rating}</td><td>{formatCurrency(h.pricePerNight)}</td><td>{formatCurrency(h.totalPrice)}</td></tr>
              ))}
            </tbody>
          </table>
          <button className="secondary-button" style={{ marginTop: ".75rem" }} onClick={() => setCompareOpen(false)}>Close</button>
        </div>
      )}
    </AppLayout>
  )
}
