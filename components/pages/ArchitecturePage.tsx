"use client"

import { Code, Database, Layers, Network } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockArchitectures } from "@/lib/mockData"

export default function ArchitecturePage() {
  const { providers } = useApp()
  const stack = [
    { label: "Frontend", value: mockArchitectures.frontend, icon: Code },
    { label: "Backend API", value: mockArchitectures.backend, icon: Network },
    { label: "AI Orchestrator", value: mockArchitectures.orchestrator, icon: Layers },
    { label: "AI Models", value: mockArchitectures.models, icon: Code },
    { label: "Database", value: mockArchitectures.database, icon: Database },
  ]

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Technical architecture"
        title="Multi-Agent Architecture"
        description="LangGraph-style routing is deterministic. Gemini runs each agent. Supabase stores trips when configured."
        icon={Network}
      />

      <div className="chip-grid" style={{ marginBottom: "1.25rem" }}>
        <span className={`chip ${providers.gemini ? "is-selected" : ""}`}>Gemini {providers.gemini ? "on" : "off"}</span>
        <span className={`chip ${providers.supabase ? "is-selected" : ""}`}>Supabase {providers.supabase ? "on" : "off"}</span>
        <span className={`chip ${providers.duffel ? "is-selected" : ""}`}>Duffel {providers.duffel ? "on" : "catalog"}</span>
        <span className={`chip ${providers.expedia ? "is-selected" : ""}`}>Hotels API {providers.expedia ? "on" : "catalog"}</span>
        <span className={`chip ${providers.maps ? "is-selected" : ""}`}>Maps {providers.maps ? "on" : "estimate"}</span>
      </div>

      <div className="content-grid-wide" style={{ marginBottom: "1.25rem" }}>
        {stack.map(({ label, value, icon: Icon }) => (
          <div className="surface panel-pad" key={label}>
            <p className="section-title"><Icon /> {label}</p>
            <p style={{ fontSize: ".85rem", fontWeight: 650, color: "#253047" }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="surface panel-pad" style={{ marginBottom: "1.25rem" }}>
        <p className="section-title">External APIs (placeholder)</p>
        <div className="chip-grid">
          {mockArchitectures.apis.map((api) => <span key={api} className="chip is-selected">{api}</span>)}
        </div>
      </div>

      <div className="surface panel-pad">
        <p className="section-title">System flow</p>
        <div className="arch-flow">
          {[
            { title: "User Input", desc: "Trip requirements submitted via frontend form" },
            { title: "Frontend (Next.js)", desc: "React dashboard, real-time agent activity UI" },
            { title: "Backend API", desc: "REST endpoints for trip state and agent orchestration" },
            { title: "LangGraph Supervisor", desc: "Orchestrates agent workflow and shared trip state" },
            { title: "Specialized AI Agents", desc: "Logistics, Recommendations, Budget — parallel processing" },
            { title: "Budget Validation", desc: "Cost checks against user constraints" },
            { title: "Negotiation Loop", desc: "Agents propose, reject, and find alternatives" },
            { title: "Final JSON Itinerary", desc: "Structured output consumed by frontend dashboard" },
          ].map((step, i) => (
            <div className="arch-step" key={step.title}>
              <span className="arch-step-num">{i + 1}</span>
              <div className="arch-step-body">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
                {step.title === "Specialized AI Agents" && (
                  <div className="arch-grid">
                    <div><strong>Logistics</strong>Flights & transport</div>
                    <div><strong>Recommendations</strong>Hotels & activities</div>
                    <div><strong>Budget</strong>Cost validation</div>
                    <div><strong>Supervisor</strong>Conflict resolution</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
