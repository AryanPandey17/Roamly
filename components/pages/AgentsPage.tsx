"use client"

import { Bot, CircleDollarSign, Compass, Plane } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"

const agents = [
  {
    name: "Supervisor Agent",
    role: "Orchestrator",
    icon: Bot,
    status: "Active",
    stats: { label: "Tasks completed", value: "12" },
    desc: "Receives requirements, delegates to agents, resolves conflicts, and produces the final itinerary.",
    metrics: [{ k: "Planning sessions", v: "12" }, { k: "Success rate", v: "98%" }],
  },
  {
    name: "Logistics Agent",
    role: "Travel Optimization",
    icon: Plane,
    status: "Completed",
    stats: { label: "Flights analyzed", value: "24" },
    desc: "Optimizes flights, transfers, and travel sequence. Prioritizes convenience and feasibility.",
    metrics: [{ k: "Routes evaluated", v: "18" }, { k: "Avg. time saved", v: "2.4h" }],
  },
  {
    name: "Recommendations Agent",
    role: "Experience Optimization",
    icon: Compass,
    status: "Completed",
    stats: { label: "Attractions found", value: "42" },
    desc: "Curates hotels, restaurants, attractions, and day-wise experiences for maximum satisfaction.",
    metrics: [{ k: "Hotels analyzed", v: "15" }, { k: "Match score", v: "94%" }],
  },
  {
    name: "Budget Agent",
    role: "Financial Validation",
    icon: CircleDollarSign,
    status: "Completed",
    stats: { label: "Budget checks", value: "8" },
    desc: "Validates costs, rejects over-budget options, and suggests cheaper alternatives.",
    metrics: [{ k: "Savings found", v: "₹32,000" }, { k: "Checks passed", v: "8/8" }],
  },
]

export default function AgentsPage() {
  const { setActivePage } = useApp()

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Multi-agent system"
        title="AI Agents"
        description="Meet the specialized agents that plan, negotiate, and optimize your trip."
        icon={Bot}
      />

      <div className="surface" style={{ marginBottom: "1.25rem" }}>
        {agents.map(({ name, role, icon: Icon, status, stats, desc, metrics }) => (
          <div className="agent-card" key={name}>
            <div className="agent-card-header">
              <div style={{ display: "flex", gap: ".75rem" }}>
                <span className="soft-icon" style={{ width: "2.5rem", height: "2.5rem" }}><Icon style={{ width: "1.1rem" }} /></span>
                <div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                </div>
              </div>
              <span className={`badge ${status === "Active" ? "ready" : "completed"}`}>{status}</span>
            </div>
            <p>{desc}</p>
            <div className="agent-metrics">
              <span><strong>{stats.value}</strong> {stats.label}</span>
              {metrics.map((m) => <span key={m.k}><strong>{m.v}</strong> {m.k}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div className="surface panel-pad">
        <p className="section-title">Architecture flow</p>
        <div className="arch-flow">
          {["User input", "Supervisor Agent", "Parallel: Logistics · Recommendations · Budget", "Negotiation loop", "Final itinerary"].map((step, i) => (
            <div className="arch-step" key={step}>
              <span className="arch-step-num">{i + 1}</span>
              <div className="arch-step-body"><h4>{step}</h4></div>
            </div>
          ))}
        </div>
        <button className="text-button" style={{ marginTop: "1rem" }} onClick={() => setActivePage("architecture")}>
          View full architecture →
        </button>
      </div>
    </AppLayout>
  )
}
