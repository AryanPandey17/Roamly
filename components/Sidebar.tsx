"use client"

import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Compass,
  Heart,
  Layers,
  LogOut,
  Map,
  Plus,
  Settings,
  UserRound,
  Zap,
} from "lucide-react"
import { ActivePage, useApp } from "@/context/AppContext"

const navItems: { page: ActivePage; label: string; icon: typeof Compass; accent?: boolean }[] = [
  { page: "dashboard", label: "Dashboard", icon: Compass },
  { page: "plan-trip", label: "Plan New Trip", icon: Plus, accent: true },
  { page: "my-trips", label: "My Trips", icon: BriefcaseBusiness },
  { page: "itinerary", label: "Itinerary", icon: Map },
  { page: "agents", label: "AI Agents", icon: Bot },
  { page: "saved", label: "Saved Places", icon: Heart },
  { page: "budget-insights", label: "Budget Insights", icon: BarChart3 },
]

export default function Sidebar() {
  const { activePage, setActivePage, user, startDemo, signOut } = useApp()

  const goHome = () => {
    void signOut()
  }

  return (
    <aside className="app-sidebar">
      <button className="brand" onClick={() => setActivePage("dashboard")} aria-label="Go to dashboard">
        <span className="brand-mark">
          <Compass />
        </span>
        <span>
          Roamly <small>AI TRIP STUDIO</small>
        </span>
      </button>

      <nav aria-label="Primary navigation">
        {navItems.map(({ page, label, icon: Icon, accent }) => (
          <button
            key={page}
            onClick={() => setActivePage(page)}
            className={`side-link ${activePage === page ? "is-active" : ""} ${accent ? "is-accent" : ""}`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="side-link"
          onClick={startDemo}
          title="Demo Mode"
        >
          <Zap />
          Demo Mode
        </button>
        <button
          className={`side-link ${activePage === "architecture" ? "is-active" : ""}`}
          onClick={() => setActivePage("architecture")}
        >
          <Layers />
          Architecture
        </button>
        <button
          className={`side-link ${activePage === "profile" ? "is-active" : ""}`}
          onClick={() => setActivePage("profile")}
        >
          <UserRound />
          Profile
        </button>
        <button
          className={`side-link ${activePage === "settings" ? "is-active" : ""}`}
          onClick={() => setActivePage("settings")}
        >
          <Settings />
          Settings
        </button>
        <div className="traveler">
          <span>{(user?.name || "T").slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user?.name || "Traveler"}</strong>
            <small>{user?.email || "Demo mode"}</small>
          </div>
          <button onClick={goHome} aria-label="Log out">
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  )
}
