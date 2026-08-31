"use client"

import { CheckCircle2, CircleAlert, MessageSquareText, Scale, Sparkles } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import { useApp } from "@/context/AppContext"

const statusStyle = { PROPOSED: "proposal", REJECTED: "rejected", APPROVED: "approved", CONSENSUS: "consensus" } as const

export default function NegotiationsPage() {
  const { negotiations, isDemoRunning, stopDemo } = useApp()
  const approved = negotiations.filter((item) => item.status === "APPROVED" || item.status === "CONSENSUS").length
  return <div className="app-shell"><Sidebar /><main className="app-main"><div className="page-wrap max-w-5xl">
    <div className="page-heading"><div><p className="eyebrow">Decision ledger</p><h1>The agents are finding common ground.</h1><p>See how convenience, quality, and budget turn into one sensible plan.</p></div><div className="soft-icon"><Scale /></div></div>
    <div className="negotiation-summary"><div><span>Messages</span><strong>{negotiations.length}</strong></div><div><span>Resolved</span><strong>{approved}</strong></div><div><span>Current round</span><strong>{negotiations.length ? "1" : "—"}</strong></div><div><span>Trip outcome</span><strong className="text-emerald-600">On budget</strong></div></div>
    <section className="surface negotiation-surface"><div className="canvas-header"><div><h2><MessageSquareText /> Negotiation thread</h2><p>Proposals are weighed against the same traveler priorities.</p></div>{isDemoRunning && <span className="live-pill"><i />Live</span>}</div>
      <div className="message-thread">{negotiations.length === 0 ? <div className="empty-feed"><Sparkles /><p>Agents are preparing their first proposals…</p></div> : negotiations.map((item, index) => <article className={`negotiation-message ${statusStyle[item.status ?? "PROPOSED"]}`} key={item.id}><div className="message-avatar">{item.agent.slice(0, 1)}</div><div className="message-content"><header><strong>{item.agent} Agent</strong><span>{item.status?.toLowerCase() ?? "proposed"}</span></header><p>{item.message}</p>{item.details && <dl>{Object.entries(item.details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}</div>{index === negotiations.length - 1 && item.status === "CONSENSUS" && <CheckCircle2 className="consensus-icon" />}{item.status === "REJECTED" && <CircleAlert className="rejected-icon" />}</article>)}</div>
      {isDemoRunning && <button className="primary-button mt-6" onClick={stopDemo}>View final itinerary <CheckCircle2 /></button>}
    </section>
  </div></main></div>
}
