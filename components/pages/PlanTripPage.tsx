"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleDollarSign, MapPin, Sparkles, Utensils, Users } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import { useApp } from "@/context/AppContext"

const steps = ["Trip basics", "Budget", "Travel style", "Food", "Notes"]
const interests = ["Adventure", "Food", "History", "Culture", "Nature", "Nightlife", "Shopping", "Photography", "Relaxation", "Technology"]

export default function PlanTripPage() {
  const { requirements, setRequirements, planTrip, setActivePage } = useApp()
  const [step, setStep] = useState(0)
  const update = <K extends keyof typeof requirements>(key: K, value: (typeof requirements)[K]) =>
    setRequirements((prev) => ({ ...prev, [key]: value }))
  const toggleInterest = (interest: string) =>
    setRequirements((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }))

  return <div className="app-shell"><Sidebar /><main className="app-main"><div className="page-wrap max-w-5xl">
    <div className="page-heading"><div><p className="eyebrow">New trip</p><h1>Build a trip that fits you.</h1><p>Give the agents the essentials. They’ll compare options, resolve trade-offs, and build the plan.</p></div><div className="soft-icon"><Sparkles /></div></div>
    <div className="stepper" aria-label="Trip planning progress">{steps.map((label, index) => <div className={`stepper-item ${index <= step ? "is-active" : ""}`} key={label}><span>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><em>{label}</em></div>)}</div>
    <section className="surface form-surface">
      {step === 0 && <><FormHeader icon={MapPin} title="Where and when?" description="Start with the outline of your journey." /><div className="field-grid"><Field label="Leaving from"><input value={requirements.from} onChange={(e) => update("from", e.target.value)} placeholder="Mumbai (BOM)" /></Field><Field label="Going to"><input value={requirements.to} onChange={(e) => {
                  const to = e.target.value
                  setRequirements((prev) => ({
                    ...prev,
                    to,
                    destination: to.replace(/\s*\(.+\)/, "").trim() || to,
                  }))
                }} placeholder="e.g. Paris, Kyoto, Goa" /></Field><Field label="Departure"><input type="date" value={requirements.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field><Field label="Return"><input type="date" value={requirements.endDate} onChange={(e) => update("endDate", e.target.value)} /></Field><Field label="Travelers"><input type="number" min="1" max="12" value={requirements.travelers} onChange={(e) => update("travelers", Number(e.target.value) || 1)} /></Field><Field label="Who’s traveling?"><select value={requirements.tripType} onChange={(e) => update("tripType", e.target.value)}>{["Solo", "Couple", "Family", "Friends", "Business"].map((item) => <option key={item}>{item}</option>)}</select></Field></div></>}
      {step === 1 && <><FormHeader icon={CircleDollarSign} title="Set a comfortable budget." description="The Budget Agent protects this limit while the other agents look for quality." /><div className="budget-display"><span>₹</span>{requirements.budget.toLocaleString("en-IN")}</div><input className="budget-range" type="range" min="50000" max="500000" step="10000" value={requirements.budget} onChange={(e) => update("budget", Number(e.target.value))} aria-label="Total trip budget" /><div className="range-labels"><span>₹50k</span><span>₹5L+</span></div><div className="choice-grid mt-8">{[["Economy", "Practical and price-led"], ["Moderate", "Great value, without cutting corners"], ["Premium", "More room for comfort"], ["Luxury", "Exceptional stays and experiences"]].map(([item, detail]) => <Choice key={item} selected={requirements.budgetCategory === item} onClick={() => update("budgetCategory", item)} title={item} detail={detail} />)}</div></>}
      {step === 2 && <><FormHeader icon={CalendarDays} title="Choose your travel rhythm." description="Select what matters. You can adjust any recommendation later." /><p className="field-label">Interests</p><div className="chip-grid">{interests.map((item) => <button type="button" key={item} onClick={() => toggleInterest(item)} className={`chip ${requirements.interests.includes(item) ? "is-selected" : ""}`}>{requirements.interests.includes(item) && <Check className="h-3.5 w-3.5" />}{item}</button>)}</div><div className="field-grid mt-8"><Field label="Travel pace"><select value={requirements.travelPace} onChange={(e) => update("travelPace", e.target.value)}>{["Relaxed", "Balanced", "Fast-paced"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Stay style"><select value={requirements.accommodation} onChange={(e) => update("accommodation", e.target.value)}>{["Budget Hotel", "Airbnb", "3 Star Hotel", "4 Star Hotel", "5 Star Hotel"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Getting around"><select value={requirements.transportation} onChange={(e) => update("transportation", e.target.value)}>{["Cheapest", "Fastest", "Balanced"].map((item) => <option key={item}>{item}</option>)}</select></Field></div></>}
      {step === 3 && <><FormHeader icon={Utensils} title="Plan around your plate." description="Help us choose meals and places that make every day feel easy." /><div className="chip-grid">{["Vegetarian", "Vegan", "Non-Vegetarian", "Local Food", "Fine Dining", "Street Food"].map((item) => <button type="button" key={item} className={`chip ${requirements.foodPreferences.includes(item) ? "is-selected" : ""}`} onClick={() => update("foodPreferences", requirements.foodPreferences.includes(item) ? requirements.foodPreferences.filter((pref) => pref !== item) : [...requirements.foodPreferences, item])}>{requirements.foodPreferences.includes(item) && <Check className="h-3.5 w-3.5" />}{item}</button>)}</div><Field label="Allergies or dietary notes" className="mt-8"><input placeholder="e.g. no shellfish, nut allergy" /></Field></>}
      {step === 4 && <><FormHeader icon={Users} title="Anything else to know?" description="The Supervisor Agent uses these notes when weighing trade-offs." /><Field label="Your ideal trip"><textarea rows={6} value={requirements.specialRequirements} onChange={(e) => update("specialRequirements", e.target.value)} placeholder="I’d love to…" /></Field><div className="summary-card"><p><strong>{requirements.from}</strong> to <strong>{requirements.to}</strong></p><span>{requirements.travelers} travelers · {requirements.budgetCategory} · ₹{requirements.budget.toLocaleString("en-IN")}</span></div></>}
      <div className="form-actions">{step === 0 ? <button className="text-button" type="button" onClick={() => setActivePage("dashboard")}>Save and exit</button> : <button className="secondary-button" type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft /> Back</button>}{step < steps.length - 1 ? <button className="primary-button" type="button" onClick={() => setStep((current) => current + 1)}>Continue <ArrowRight /></button> : <button className="primary-button" type="button" onClick={planTrip}>Generate trip plan <Sparkles /></button>}</div>
    </section>
  </div></main></div>
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`field ${className}`}><span>{label}</span>{children}</label> }
function FormHeader({ icon: Icon, title, description }: { icon: typeof MapPin; title: string; description: string }) { return <div className="form-header"><div className="soft-icon"><Icon /></div><div><h2>{title}</h2><p>{description}</p></div></div> }
function Choice({ selected, onClick, title, detail }: { selected: boolean; onClick: () => void; title: string; detail: string }) { return <button type="button" className={`choice ${selected ? "is-selected" : ""}`} onClick={onClick}><span className="choice-dot">{selected && <Check className="h-3.5 w-3.5" />}</span><strong>{title}</strong><small>{detail}</small></button> }
