"use client"

import { useState } from "react"
import { Compass, Heart, Plus, Star } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { viewActivities } from "@/lib/trip/view"

const categories = ["All", "Culture", "Food", "Nightlife", "Nature", "Technology", "Photography"]

export default function LocalRecsPage() {
  const { savedItems, toggleSaveItem, activeTrip } = useApp()
  const recs = viewActivities(activeTrip)
  const [activeCategory, setActiveCategory] = useState("All")
  const [added, setAdded] = useState<string[]>([])

  const filtered = activeCategory === "All"
    ? recs
    : recs.filter((r) => r.category === activeCategory)

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Local recommendations"
        title="Things to do"
        description="Attractions, restaurants, and hidden gems curated for your trip."
        icon={Compass}
      />

      <div className="tab-bar">
        {categories.map((cat) => (
          <button key={cat} type="button" className={`tab-btn ${activeCategory === cat ? "is-active" : ""}`} onClick={() => setActiveCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div className="content-grid-wide">
        {filtered.map((rec) => (
          <div className="item-card" key={rec.id}>
            <div className="item-card-header">
              <div style={{ display: "flex", gap: ".65rem" }}>
                <span style={{ fontSize: "2rem" }}>🎯</span>
                <div>
                  <h3>{rec.name}</h3>
                  <span className="badge draft" style={{ marginTop: ".35rem" }}>{rec.category}</span>
                </div>
              </div>
              <button className="secondary-button" style={{ padding: ".45rem" }} onClick={() => toggleSaveItem("recs", rec.id)}>
                <Heart style={{ width: ".9rem", fill: savedItems.recs.includes(rec.id) ? "#e05f7a" : "none", color: savedItems.recs.includes(rec.id) ? "#e05f7a" : undefined }} />
              </button>
            </div>
            <p style={{ fontSize: ".78rem", color: "#687186", lineHeight: 1.5 }}>{rec.description}</p>
            <div className="field-grid" style={{ margin: ".75rem 0", fontSize: ".72rem" }}>
              <div><span style={{ color: "#8892a4" }}>Cost</span><p style={{ fontWeight: 700 }}>{rec.costLabel}</p></div>
              <div><span style={{ color: "#8892a4" }}>Duration</span><p style={{ fontWeight: 700 }}>{rec.duration}</p></div>
              <div><span style={{ color: "#8892a4" }}>Best time</span><p style={{ fontWeight: 700 }}>{rec.bestTime}</p></div>
              <div style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                <Star style={{ width: ".75rem", color: "#c78320", fill: "#c78320" }} />
                <span style={{ fontWeight: 700 }}>{rec.rating}</span>
              </div>
            </div>
            <button
              className={added.includes(rec.id) ? "secondary-button" : "primary-button"}
              style={{ width: "100%" }}
              onClick={() => setAdded((prev) => prev.includes(rec.id) ? prev : [...prev, rec.id])}
            >
              {added.includes(rec.id) ? "Added to trip ✓" : <><Plus /> Add to trip</>}
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
