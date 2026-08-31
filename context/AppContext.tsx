"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import {
  TripRequirements,
  initialRequirements,
  AgentActivityLog,
  mockAgentLogs,
  NegotiationMessage,
  mockNegotiations,
} from "@/lib/mockData"

export type ActivePage =
  | "landing"
  | "login"
  | "signup"
  | "forgot-password"
  | "dashboard"
  | "plan-trip"
  | "planning-process"
  | "negotiations"
  | "itinerary"
  | "flights"
  | "accommodation"
  | "local-recs"
  | "budget-insights"
  | "agents"
  | "architecture"
  | "my-trips"
  | "saved"
  | "profile"
  | "settings"
  | "about"

type SavedItemId = string | number

interface AppContextType {
  activePage: ActivePage
  setActivePage: (page: ActivePage) => void
  user: { name: string; email: string; avatar: string } | null
  setUser: (user: { name: string; email: string; avatar: string } | null) => void
  requirements: TripRequirements
  setRequirements: (reqs: TripRequirements) => void
  logs: AgentActivityLog[]
  setLogs: (logs: AgentActivityLog[]) => void
  negotiations: NegotiationMessage[]
  setNegotiations: (neg: NegotiationMessage[]) => void
  isDemoRunning: boolean
  startDemo: () => void
  stopDemo: () => void
  theme: "light" | "dark" | "system"
  setTheme: (t: "light" | "dark" | "system") => void
  currency: string
  setCurrency: (c: string) => void
  savedItems: { hotels: SavedItemId[]; flights: SavedItemId[]; recs: SavedItemId[] }
  setSavedItems: React.Dispatch<
    React.SetStateAction<{ hotels: SavedItemId[]; flights: SavedItemId[]; recs: SavedItemId[] }>
  >
  toggleSaveItem: (category: "hotels" | "flights" | "recs", id: SavedItemId) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

let demoTimers: ReturnType<typeof setInterval | typeof setTimeout>[] = []

function clearDemoTimers() {
  demoTimers.forEach(clearInterval)
  demoTimers.forEach(clearTimeout)
  demoTimers = []
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<ActivePage>("landing")
  const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>(null)
  const [requirements, setRequirements] = useState<TripRequirements>(initialRequirements)
  const [logs, setLogs] = useState<AgentActivityLog[]>([])
  const [negotiations, setNegotiations] = useState<NegotiationMessage[]>([])
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light")
  const [currency, setCurrency] = useState("INR")
  const [savedItems, setSavedItems] = useState<{
    hotels: SavedItemId[]
    flights: SavedItemId[]
    recs: SavedItemId[]
  }>({ hotels: ["hotel-1"], flights: ["flight-1"], recs: ["rec-1", "rec-2"] })

  useEffect(() => {
    const root = window.document.documentElement
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = theme === "dark" || (theme === "system" && prefersDark)
    root.classList.toggle("dark", isDark)
  }, [theme])

  const toggleSaveItem = (category: "hotels" | "flights" | "recs", id: SavedItemId) => {
    setSavedItems((prev) => {
      const items = [...prev[category]]
      if (items.includes(id)) {
        return { ...prev, [category]: items.filter((x) => x !== id) }
      }
      return { ...prev, [category]: [...items, id] }
    })
  }

  const runPlanningSimulation = () => {
    clearDemoTimers()
    setIsDemoRunning(true)
    setActivePage("planning-process")
    setLogs([])
    setNegotiations([])

    let logIdx = 0
    const logInterval = setInterval(() => {
      if (logIdx < mockAgentLogs.length) {
        setLogs((prev) => [...prev, mockAgentLogs[logIdx]])
        logIdx++
      } else {
        clearInterval(logInterval)
        const t1 = setTimeout(() => {
          setActivePage("negotiations")
          let negIdx = 0
          const negInterval = setInterval(() => {
            if (negIdx < mockNegotiations.length) {
              setNegotiations((prev) => [...prev, mockNegotiations[negIdx]])
              negIdx++
            } else {
              clearInterval(negInterval)
              const t2 = setTimeout(() => {
                setIsDemoRunning(false)
                setActivePage("itinerary")
              }, 3000)
              demoTimers.push(t2)
            }
          }, 1800)
          demoTimers.push(negInterval)
        }, 1200)
        demoTimers.push(t1)
      }
    }, 900)
    demoTimers.push(logInterval)
  }

  const startDemo = () => {
    setRequirements(initialRequirements)
    runPlanningSimulation()
  }

  const stopDemo = () => {
    clearDemoTimers()
    setIsDemoRunning(false)
    setLogs(mockAgentLogs)
    setNegotiations(mockNegotiations)
    setActivePage("itinerary")
  }

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        user,
        setUser,
        requirements,
        setRequirements,
        logs,
        setLogs,
        negotiations,
        setNegotiations,
        isDemoRunning,
        startDemo,
        stopDemo,
        theme,
        setTheme,
        currency,
        setCurrency,
        savedItems,
        setSavedItems,
        toggleSaveItem,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
