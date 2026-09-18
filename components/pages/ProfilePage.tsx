"use client"

import { useState } from "react"
import { Calendar, Edit2, MapPin, Save, User } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"

export default function ProfilePage() {
  const { user, setUser, requirements, profile, updateProfile, supabaseEnabled, syncError } = useApp()
  const [editing, setEditing] = useState(false)
  const profileForm = {
    name: profile?.full_name || user?.name || "Traveler",
    email: user?.email || profile?.email || "demo@roamly.app",
    location: profile?.home_location || "Mumbai, India",
    style: profile?.travel_style || requirements.tripType,
    countries: profile?.countries_visited?.join(", ") || "Japan, India, France, Indonesia",
  }
  const [form, setForm] = useState(profileForm)
  const displayForm = editing ? form : profileForm

  const save = async () => {
    const saved = await updateProfile({
      full_name: form.name,
      home_location: form.location,
      travel_style: form.style,
      countries_visited: form.countries
        .split(",")
        .map((country) => country.trim())
        .filter(Boolean),
    })
    if (supabaseEnabled && !saved) return
    setUser({ id: user?.id, name: form.name, email: user?.email || form.email, avatar: user?.avatar || "" })
    setEditing(false)
  }

  return (
    <AppLayout maxWidth="max-w-3xl">
      <PageHeader eyebrow="Account" title="Profile" description="Your travel preferences and account details." icon={User} />

      {syncError && supabaseEnabled && <div className="demo-banner" style={{ marginBottom: "1rem" }}><p>{syncError}</p></div>}

      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg, #eeefff, #e9faf6)", padding: "1.75rem", borderBottom: "1px solid #edf0f5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ width: "4rem", height: "4rem", borderRadius: "1rem", background: "#5b5ce2", color: "#fff", display: "grid", placeItems: "center", fontSize: "1.5rem", fontWeight: 800 }}>
              {displayForm.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 750, color: "#172033" }}>{displayForm.name}</h2>
              <p style={{ fontSize: ".82rem", color: "#687186" }}>{displayForm.email}</p>
            </div>
          </div>
        </div>

        <div className="panel-pad">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <p className="section-title" style={{ margin: 0 }}>Personal information</p>
            {!editing ? (
              <button className="secondary-button" onClick={() => { setForm(profileForm); setEditing(true) }}><Edit2 /> Edit</button>
            ) : (
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button className="secondary-button" onClick={() => setEditing(false)}>Cancel</button>
                <button className="primary-button" onClick={save}><Save /> Save</button>
              </div>
            )}
          </div>

          {[
            { label: "Full name", key: "name" as const, icon: User },
            { label: "Email", key: "email" as const, icon: User },
            { label: "Home location", key: "location" as const, icon: MapPin },
            { label: "Travel style", key: "style" as const, icon: Calendar },
          ].map(({ label, key, icon: Icon }) => (
            <div className="field" key={key} style={{ marginBottom: "1rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: ".35rem" }}><Icon style={{ width: ".85rem" }} /> {label}</span>
              {editing ? (
                <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              ) : (
                <p style={{ fontWeight: 600, color: "#253047", padding: ".5rem 0" }}>{displayForm[key]}</p>
              )}
            </div>
          ))}

          <div className="field">
            <span>Countries visited</span>
            {editing ? (
              <input value={form.countries} onChange={(e) => setForm({ ...form, countries: e.target.value })} />
            ) : (
              <p style={{ fontWeight: 600, color: "#253047", padding: ".5rem 0" }}>{displayForm.countries}</p>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: "1.25rem" }}>
        <div className="stat-card"><div><p>Trips planned</p><strong>6</strong></div></div>
        <div className="stat-card"><div><p>Interests</p><strong>{requirements.interests.length}</strong></div></div>
        <div className="stat-card"><div><p>Total savings</p><strong>₹32,000</strong></div></div>
      </div>
    </AppLayout>
  )
}
