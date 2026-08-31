"use client"

import { Compass, Heart, Hotel, Plane, Trash2 } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockFlights, mockHotels, mockRecommendations } from "@/lib/mockData"
import { formatCurrency } from "@/lib/utils"

export default function SavedPage() {
  const { savedItems, toggleSaveItem, setActivePage } = useApp()

  const flights = mockFlights.filter((f) => savedItems.flights.includes(f.id))
  const hotels = mockHotels.filter((h) => savedItems.hotels.includes(h.id))
  const recs = mockRecommendations.filter((r) => savedItems.recs.includes(r.id))
  const total = flights.length + hotels.length + recs.length

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Favorites"
        title="Saved Places"
        description={`${total} item${total !== 1 ? "s" : ""} saved for your trips.`}
        icon={Heart}
      />

      {total === 0 ? (
        <div className="surface panel-pad" style={{ textAlign: "center" }}>
          <Heart style={{ width: "2.5rem", color: "#8892a4", margin: "0 auto .75rem" }} />
          <p style={{ color: "#687186", marginBottom: "1rem" }}>Save flights, hotels, and activities as you explore.</p>
          <button className="primary-button" onClick={() => setActivePage("local-recs")}>Browse recommendations</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {flights.length > 0 && (
            <section>
              <p className="section-title"><Plane /> Flights</p>
              <div className="surface">
                {flights.map((f) => (
                  <div className="list-row" key={f.id}>
                    <div><h4>{f.airline} {f.flightNumber}</h4><p>{f.from} → {f.to} · {f.duration}</p></div>
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                      <strong>{formatCurrency(f.price)}</strong>
                      <button className="secondary-button" style={{ padding: ".4rem" }} onClick={() => toggleSaveItem("flights", f.id)}><Trash2 style={{ width: ".85rem" }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hotels.length > 0 && (
            <section>
              <p className="section-title"><Hotel /> Hotels</p>
              <div className="surface">
                {hotels.map((h) => (
                  <div className="list-row" key={h.id}>
                    <div><h4>{h.name}</h4><p>{h.location} · ★ {h.rating}</p></div>
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                      <strong>{formatCurrency(h.pricePerNight)}/night</strong>
                      <button className="secondary-button" style={{ padding: ".4rem" }} onClick={() => toggleSaveItem("hotels", h.id)}><Trash2 style={{ width: ".85rem" }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recs.length > 0 && (
            <section>
              <p className="section-title"><Compass /> Recommendations</p>
              <div className="surface">
                {recs.map((r) => (
                  <div className="list-row" key={r.id}>
                    <div><h4>{r.name}</h4><p>{r.category} · {r.cost}</p></div>
                    <button className="secondary-button" style={{ padding: ".4rem" }} onClick={() => toggleSaveItem("recs", r.id)}><Trash2 style={{ width: ".85rem" }} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="surface panel-pad">
            <p className="section-title">Collection: Japan Trip Ideas</p>
            <p style={{ fontSize: ".82rem", color: "#687186" }}>{recs.length + hotels.length} saved items for your Tokyo adventure.</p>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
