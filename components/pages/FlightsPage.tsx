"use client"

import { useState } from "react"
import { Check, Heart, Plane } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockFlights } from "@/lib/mockData"
import { formatCurrency } from "@/lib/utils"

export default function FlightsPage() {
  const { requirements, savedItems, toggleSaveItem } = useApp()
  const [selected, setSelected] = useState(mockFlights.find((f) => f.selected)?.id ?? "flight-1")
  const [compare, setCompare] = useState<string[]>([])

  const toggleCompare = (id: string) => {
    setCompare((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev)
  }

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Logistics agent"
        title="Flight options"
        description={`Recommended flights for ${requirements.from} → ${requirements.to}`}
        icon={Plane}
      />

      {compare.length > 0 && (
        <div className="demo-banner">
          <p><strong>Comparing {compare.length} flights</strong> — side-by-side view (demo)</p>
          <button className="text-button" onClick={() => setCompare([])}>Clear</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
        {mockFlights.map((flight) => (
          <div className="item-card" key={flight.id}>
            <div className="item-card-header">
              <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
                <span style={{ fontSize: "1.75rem" }}>{flight.logo}</span>
                <div>
                  <h3>{flight.airline} · {flight.flightNumber}</h3>
                  <p style={{ fontSize: ".75rem", color: "#687186", marginTop: ".15rem" }}>
                    {flight.from} → {flight.to}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: ".35rem", alignItems: "center" }}>
                {flight.badge && <span className="badge ready">{flight.badge}</span>}
                {selected === flight.id && <span className="badge completed">Selected</span>}
                <button
                  className="secondary-button"
                  style={{ padding: ".45rem" }}
                  onClick={() => toggleSaveItem("flights", flight.id)}
                >
                  <Heart style={{ width: ".9rem", fill: savedItems.flights.includes(flight.id) ? "#e05f7a" : "none", color: savedItems.flights.includes(flight.id) ? "#e05f7a" : undefined }} />
                </button>
              </div>
            </div>

            <div className="field-grid" style={{ marginBottom: ".75rem" }}>
              <div><span style={{ fontSize: ".68rem", color: "#8892a4" }}>Departure</span><p style={{ fontWeight: 750 }}>{flight.departure}</p></div>
              <div><span style={{ fontSize: ".68rem", color: "#8892a4" }}>Arrival</span><p style={{ fontWeight: 750 }}>{flight.arrival}</p></div>
              <div><span style={{ fontSize: ".68rem", color: "#8892a4" }}>Duration</span><p style={{ fontWeight: 750 }}>{flight.duration}</p></div>
              <div><span style={{ fontSize: ".68rem", color: "#8892a4" }}>Stops</span><p style={{ fontWeight: 750 }}>{flight.stops}</p></div>
            </div>

            <div className="item-card-footer">
              <div>
                <span style={{ fontSize: ".72rem", color: "#8892a4" }}>Price per person</span>
                <div className="price-tag">{formatCurrency(flight.price)}</div>
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button className="secondary-button" onClick={() => toggleCompare(flight.id)}>Compare</button>
                <button className={selected === flight.id ? "secondary-button" : "primary-button"} onClick={() => setSelected(flight.id)}>
                  {selected === flight.id ? <><Check /> Selected</> : "Select flight"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
