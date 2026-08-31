"use client"

import { Bot, Compass, Info, Sparkles } from "lucide-react"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"

export default function AboutPage() {
  const { setActivePage, startDemo } = useApp()

  return (
    <AppLayout maxWidth="max-w-4xl">
      <PageHeader
        eyebrow="About the project"
        title="Multi-Agent AI Trip Planning Orchestrator"
        description="An intelligent travel platform where specialized AI agents collaborate and negotiate."
        icon={Info}
      />

      <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
        <p className="section-title">Problem statement</p>
        <p style={{ fontSize: ".88rem", color: "#687186", lineHeight: 1.65 }}>
          Traditional trip planning requires searching multiple websites for flights, hotels, attractions,
          transportation, and budgets. Users spend hours comparing options without clear trade-offs.
        </p>
      </div>

      <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
        <p className="section-title">Our solution</p>
        <p style={{ fontSize: ".88rem", color: "#687186", lineHeight: 1.65, marginBottom: "1rem" }}>
          Multiple AI agents collaborate to automate planning. Each agent has different priorities and
          negotiates with others until a balanced plan is created.
        </p>
        <div className="content-grid-wide">
          {[
            { agent: "Logistics", priority: "Convenience & feasibility" },
            { agent: "Recommendations", priority: "Experience & satisfaction" },
            { agent: "Budget", priority: "Cost control" },
            { agent: "Supervisor", priority: "Balance all priorities" },
          ].map(({ agent, priority }) => (
            <div key={agent} style={{ background: "#f7f8fc", border: "1px solid #edf0f5", borderRadius: ".75rem", padding: ".85rem" }}>
              <strong style={{ fontSize: ".82rem", color: "#4f50c6" }}>{agent} Agent</strong>
              <p style={{ fontSize: ".75rem", color: "#687186", marginTop: ".25rem" }}>{priority}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface panel-pad" style={{ marginBottom: "1rem" }}>
        <p className="section-title">Benefits</p>
        <ul style={{ fontSize: ".85rem", color: "#687186", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
          <li>Better decision making through specialized agents</li>
          <li>Personalized travel plans based on your preferences</li>
          <li>Strict budget control with transparent reasoning</li>
          <li>Visible AI negotiation — see why choices were made</li>
          <li>Optimized schedules and day-wise itineraries</li>
        </ul>
      </div>

      <div className="hero-banner">
        <h2>See it in action</h2>
        <p>Run the demo to watch agents plan a Mumbai → Tokyo trip in real time.</p>
        <div className="hero-banner-actions">
          <button className="primary-button" onClick={startDemo}><Sparkles /> Launch Demo</button>
          <button className="secondary-button" onClick={() => setActivePage("architecture")}><Bot /> View architecture</button>
          <button className="secondary-button" onClick={() => setActivePage("plan-trip")}><Compass /> Plan a trip</button>
        </div>
      </div>
    </AppLayout>
  )
}
