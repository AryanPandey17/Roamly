"use client"

import { useEffect, useRef } from "react"
import { Bot, CheckCircle2, CircleDollarSign, Compass, LoaderCircle, Plane, Sparkles } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import { useApp } from "@/context/AppContext"

const agentMeta = [
  { name: "Supervisor", description: "Balancing the whole trip", icon: Bot, color: "violet" },
  { name: "Logistics", description: "Routes and timing", icon: Plane, color: "sky" },
  { name: "Recommendations", description: "Stays and experiences", icon: Compass, color: "rose" },
  { name: "Budget", description: "Cost and trade-offs", icon: CircleDollarSign, color: "emerald" },
]

export default function PlanningProcessPage() {
  const { logs, isDemoRunning, stopDemo } = useApp()
  const feed = useRef<HTMLDivElement>(null)
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" }) }, [logs.length])
  const activeAgents = new Set(logs.map((log) => log.agent))

  return <div className="app-shell"><Sidebar /><main className="app-main"><div className="page-wrap max-w-6xl">
    <div className="page-heading"><div><p className="eyebrow">Agent workspace</p><h1>Your trip is taking shape.</h1><p>Specialists are exploring options in parallel. The Supervisor will bring the best balance together.</p></div><span className={`live-pill ${isDemoRunning ? "" : "is-complete"}`}><i />{isDemoRunning ? "Planning now" : "Plan complete"}</span></div>
    <div className="planning-grid">
      <section className="surface agent-canvas">
        <div className="canvas-header"><div><h2>Collaboration map</h2><p>Each decision is checked against your travel brief.</p></div><span>{logs.length} actions</span></div>
        <div className="network" aria-label="AI agent collaboration network"><div className="network-core"><Bot /><strong>Supervisor</strong><small>Orchestrating</small></div>{agentMeta.slice(1).map(({ name, description, icon: Icon, color }) => <div className={`agent-node ${color} ${activeAgents.has(name as "Logistics" | "Recommendations" | "Budget") ? "is-working" : ""}`} key={name}><span><Icon /></span><strong>{name}</strong><small>{description}</small></div>)}</div>
        <div className="network-caption"><Sparkles />The supervisor is reconciling convenience, experience, and spend.</div>
      </section>
      <section className="surface activity-surface"><div className="canvas-header"><div><h2>Live decisions</h2><p>Everything the agents are considering.</p></div><LoaderCircle className={isDemoRunning ? "animate-spin text-violet-500" : "text-emerald-500"} /></div><div className="activity-feed" ref={feed}>{logs.length === 0 ? <div className="empty-feed"><LoaderCircle className="animate-spin" /><p>Reading your trip brief…</p></div> : logs.map((log, index) => <div className={`activity-item ${log.type}`} key={`${log.timestamp}-${index}`}><span className="activity-mark">{log.type === "success" ? <CheckCircle2 /> : <Bot />}</span><div><header><strong>{log.agent}</strong><time>{log.timestamp}</time></header><p>{log.message}</p>{log.round && <small>Negotiation round {log.round}</small>}</div></div>)}</div>{isDemoRunning && <button className="text-button mt-4" onClick={stopDemo}>Skip to final itinerary →</button>}</section>
    </div>
  </div></main></div>
}
