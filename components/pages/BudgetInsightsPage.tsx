"use client"

import { useState } from "react"
import { BarChart3, Sparkles, TrendingDown } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import AppLayout from "@/components/AppLayout"
import PageHeader from "@/components/PageHeader"
import { useApp } from "@/context/AppContext"
import { mockOptimizations } from "@/lib/mockData"
import { viewBudget } from "@/lib/trip/view"
import { formatCurrency } from "@/lib/utils"

const COLORS = ["#5b5ce2", "#149d87", "#c78320", "#2182bd", "#e05f7a", "#687186"]

export default function BudgetInsightsPage() {
  const { activeTrip, requirements } = useApp()
  const [applied, setApplied] = useState<string[]>([])
  const budget = viewBudget(activeTrip)
  const currency = activeTrip?.currency || requirements.currency || "INR"
  const chartData = budget.rows.map((item) => ({ name: item.category, value: item.amount }))

  return (
    <AppLayout maxWidth="max-w-5xl">
      <PageHeader
        eyebrow="Financial dashboard"
        title="Budget Insights"
        description="Figures come from the Budget Agent's calculateTotal tool, not LLM arithmetic."
        icon={BarChart3}
      />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <div><p>Total Budget</p><strong>{formatCurrency(budget.budgetTotal, currency)}</strong></div>
          <span className="stat-icon purple"><BarChart3 /></span>
        </div>
        <div className="stat-card">
          <div><p>Estimated Spending</p><strong>{formatCurrency(budget.spent, currency)}</strong></div>
          <span className="stat-icon blue"><BarChart3 /></span>
        </div>
        <div className="stat-card">
          <div><p>Remaining</p><strong style={{ color: budget.remaining >= 0 ? "#149d87" : "#c55050" }}>{formatCurrency(budget.remaining, currency)}</strong></div>
          <span className="stat-icon green"><TrendingDown /></span>
        </div>
      </div>

      <div className="content-grid">
        <div className="surface panel-pad">
          <p className="section-title">Spending distribution</p>
          <div style={{ height: "14rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface panel-pad">
          <p className="section-title">Category breakdown</p>
          <div style={{ height: "14rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                <Bar dataKey="value" fill="#5b5ce2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="health-banner" style={{ margin: "1.25rem 0" }}>
        <strong>Budget health: {budget.health}</strong>
        <p>{activeTrip?.tripState?.budgetFeedback || `Remaining ${formatCurrency(budget.remaining, currency)}.`}</p>
      </div>

      <div className="surface panel-pad" style={{ marginTop: "1.25rem" }}>
        <p className="section-title"><Sparkles /> Negotiation outcome</p>
        {activeTrip?.tripState?.budgetFeedback ? (
          <p style={{ fontSize: ".85rem", color: "#465066", lineHeight: 1.5 }}>{activeTrip.tripState.budgetFeedback}</p>
        ) : (
          mockOptimizations.map((opt) => (
            <div className="optimization-card" key={opt.id}>
              <div className="before"><span>{opt.label}</span><strong>{opt.current}</strong></div>
              <span className="savings">Save ₹{opt.savings.toLocaleString("en-IN")}</span>
              <div className="after"><span>Alternative</span><strong>{opt.alternative}</strong></div>
              <button
                className={applied.includes(opt.id) ? "secondary-button" : "primary-button"}
                style={{ gridColumn: "1 / -1", justifySelf: "start" }}
                onClick={() => setApplied((prev) => prev.includes(opt.id) ? prev : [...prev, opt.id])}
                disabled={applied.includes(opt.id)}
              >
                {applied.includes(opt.id) ? "Applied ✓" : "Apply AI recommendation"}
              </button>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  )
}
