"use client"

import { useState } from "react"
import { Bell, Globe, Palette, Settings, Shield } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"

export default function SettingsPage() {
  const { theme, setTheme, currency, setCurrency } = useApp()
  const [notifications, setNotifications] = useState({
    tripUpdates: true,
    planningComplete: true,
    budgetAlerts: true,
  })

  return (
    <AppLayout maxWidth="max-w-3xl">
      <PageHeader eyebrow="Preferences" title="Settings" description="Appearance, notifications, and account preferences." icon={Settings} />

      <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
        <p className="section-title"><Palette /> Appearance</p>
        <div className="choice-grid">
          {(["light", "dark", "system"] as const).map((t) => (
            <button key={t} type="button" className={`choice ${theme === t ? "is-selected" : ""}`} onClick={() => setTheme(t)}>
              <strong style={{ textTransform: "capitalize" }}>{t}</strong>
              <small>{t === "system" ? "Match your device" : `${t} theme`}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
        <p className="section-title"><Bell /> Notifications</p>
        {[
          { key: "tripUpdates" as const, label: "Trip updates", desc: "Changes to your itinerary" },
          { key: "planningComplete" as const, label: "AI planning completion", desc: "When agents finish planning" },
          { key: "budgetAlerts" as const, label: "Budget alerts", desc: "When costs exceed limits" },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".75rem 0", borderBottom: "1px solid #f0f1f5" }}>
            <div>
              <strong style={{ fontSize: ".85rem", color: "#253047" }}>{label}</strong>
              <p style={{ fontSize: ".75rem", color: "#8892a4" }}>{desc}</p>
            </div>
            <button
              type="button"
              className={`choice-dot ${notifications[key] ? "is-selected" : ""}`}
              style={{ width: "2.5rem", height: "1.35rem", borderRadius: "99px", background: notifications[key] ? "#5b5ce2" : "#e0e4ed", border: "none", position: "relative" }}
              onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))}
              aria-label={label}
            />
          </div>
        ))}
      </div>

      <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
        <p className="section-title"><Globe /> Regional</p>
        <div className="field-grid">
          <label className="field">
            <span>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
          <label className="field">
            <span>Language</span>
            <select defaultValue="en">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
            </select>
          </label>
        </div>
      </div>

      <div className="surface panel-pad">
        <p className="section-title"><Shield /> Privacy</p>
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          <button className="secondary-button" style={{ justifyContent: "flex-start" }}>Change password</button>
          <button className="secondary-button" style={{ justifyContent: "flex-start" }}>Privacy policy</button>
          <button className="secondary-button" style={{ justifyContent: "flex-start", color: "#c55050", borderColor: "#f5d0d0" }}>Delete account</button>
        </div>
      </div>
    </AppLayout>
  )
}
