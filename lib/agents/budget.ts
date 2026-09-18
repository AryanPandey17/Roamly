import { calculateTotal, nightsBetween, nightlyCeilingToFitBudget } from "@/lib/agents/math"
import { runGeminiJson } from "@/lib/agents/gemini"
import { pipelineLog, pipelineWarn } from "@/lib/agents/log"
import { BUDGET_PROMPT } from "@/lib/agents/prompts"
import type { CostBreakdown, TripState } from "@/lib/types/trip"

export async function runBudgetAgent(state: TripState, useLlm: boolean) {
  const nights = nightsBetween(state.startDate, state.endDate)
  const breakdown = calculateTotal({
    flights: state.proposedFlights,
    hotel: state.proposedHotel,
    activities: state.proposedActivities,
    nights,
    travelers: state.travelerCount,
  })

  const approved = breakdown.total <= state.budgetTotal
  const ceiling = nightlyCeilingToFitBudget({
    budgetTotal: state.budgetTotal,
    flightCost: breakdown.flightCost,
    activitiesCost: breakdown.activitiesCost,
    nights,
  })

  pipelineLog(
    "budget.calc",
    `total=${breakdown.total} budget=${state.budgetTotal} flights=${breakdown.flightCost} hotel=${breakdown.hotelCost} activities=${breakdown.activitiesCost} approved=${approved} ceiling=${ceiling}`
  )

  const fallbackFeedback = approved
    ? `Total is ${state.currency} ${breakdown.total} against a ${state.currency} ${state.budgetTotal} budget. Margin ${state.currency} ${state.budgetTotal - breakdown.total}.`
    : `Total is ${state.currency} ${breakdown.total} against a ${state.currency} ${state.budgetTotal} budget. Housing is ${breakdown.breakdownPct.hotel}% of cost. Need accommodation under ${state.currency} ${ceiling}/night.`

  if (!useLlm) {
    pipelineLog("budget", "verdict without LLM")
    return {
      budgetStatus: approved ? "approved" : "rejected",
      budgetFeedback: fallbackFeedback,
      breakdown,
    } as const
  }

  try {
    const result = await runGeminiJson<{ budgetStatus?: string; budgetFeedback?: string }>({
      system: BUDGET_PROMPT,
      user: JSON.stringify({
        calculateTotalResult: breakdown,
        budgetTotal: state.budgetTotal,
        currency: state.currency,
        nights,
        suggestedNightlyCeiling: ceiling,
        instruction:
          "Do not do arithmetic. Quote only numbers from calculateTotalResult. If over budget, name one nightly ceiling using suggestedNightlyCeiling.",
      }),
    })

    return {
      budgetStatus: approved ? "approved" : "rejected",
      budgetFeedback: result.budgetFeedback || fallbackFeedback,
      breakdown,
    } as const
  } catch (error) {
    pipelineWarn("budget", "LLM copy failed, using calculator copy", error)
    return {
      budgetStatus: approved ? "approved" : "rejected",
      budgetFeedback: fallbackFeedback,
      breakdown,
    } as const
  }
}

export type BudgetVerdict = Awaited<ReturnType<typeof runBudgetAgent>>
export type { CostBreakdown }
