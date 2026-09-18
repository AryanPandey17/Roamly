"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import {
  TripRequirements,
  initialRequirements,
  AgentActivityLog,
  mockAgentLogs,
  NegotiationMessage,
  mockNegotiations,
} from "@/lib/mockData"
import { apiGet, fetchStatus, planTripStream, type ProviderStatus } from "@/lib/api"
import { getBrowserSupabase, isBrowserSupabaseConfigured } from "@/lib/supabase/browser"
import type { AgentEvent, TripRecord } from "@/lib/types/trip"

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
  user: { id?: string; name: string; email: string; avatar: string } | null
  setUser: (user: { id?: string; name: string; email: string; avatar: string } | null) => void
  requirements: TripRequirements
  setRequirements: React.Dispatch<React.SetStateAction<TripRequirements>>
  logs: AgentActivityLog[]
  setLogs: (logs: AgentActivityLog[]) => void
  negotiations: NegotiationMessage[]
  setNegotiations: (neg: NegotiationMessage[]) => void
  isDemoRunning: boolean
  startDemo: () => void
  planTrip: () => void
  stopDemo: () => void
  theme: "light" | "dark" | "system"
  setTheme: (t: "light" | "dark" | "system") => void
  currency: string
  setCurrency: (c: string) => void
  savedItems: { hotels: SavedItemId[]; flights: SavedItemId[]; recs: SavedItemId[] }
  setSavedItems: React.Dispatch<
    React.SetStateAction<{ hotels: SavedItemId[]; flights: SavedItemId[]; recs: SavedItemId[] }>
  >
  toggleSaveItem: (category: "hotels" | "flights" | "recs", id: SavedItemId, payload?: unknown, title?: string) => void
  providers: ProviderStatus
  accessToken: string | null
  activeTrip: TripRecord | null
  setActiveTrip: (trip: TripRecord | null) => void
  trips: TripRecord[]
  refreshTrips: () => Promise<void>
  supabaseEnabled: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const emptyProviders: ProviderStatus = {
  gemini: false,
  supabase: false,
  duffel: false,
  expedia: false,
  maps: false,
  activities: false,
  tavily: false,
}

function toLog(event: AgentEvent): AgentActivityLog {
  return {
    timestamp: event.timestamp,
    agent: event.agent,
    message: event.message,
    type: event.type,
    round: event.round,
  }
}

function toNegotiation(event: AgentEvent, index: number): NegotiationMessage | null {
  if (!event.status) return null
  return {
    id: `live-${index}-${event.timestamp}`,
    agent: event.agent,
    message: event.message,
    status: event.status,
    details: event.details,
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<ActivePage>("landing")
  const [user, setUser] = useState<{ id?: string; name: string; email: string; avatar: string } | null>(null)
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
  const [providers, setProviders] = useState<ProviderStatus>(emptyProviders)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null)
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [authError, setAuthError] = useState<string | null>(null)
  const abortRef = useRef(false)
  const supabaseEnabled = isBrowserSupabaseConfigured()

  useEffect(() => {
    fetchStatus().then(setProviders).catch(() => setProviders(emptyProviders))
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = theme === "dark" || (theme === "system" && prefersDark)
    root.classList.toggle("dark", isDark)
  }, [theme])

  const refreshTrips = useCallback(async () => {
    if (!supabaseEnabled || !accessToken) return
    const data = await apiGet<{ trips: TripRecord[] }>("/api/trips", accessToken)
    setTrips(data.trips || [])
  }, [accessToken, supabaseEnabled])

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (!session) return
      setAccessToken(session.access_token)
      setUser({
        id: session.user.id,
        name: (session.user.user_metadata?.full_name as string) || session.user.email?.split("@")[0] || "Traveler",
        email: session.user.email || "",
        avatar: "",
      })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: (session.user.user_metadata?.full_name as string) || session.user.email?.split("@")[0] || "Traveler",
          email: session.user.email || "",
          avatar: "",
        })
      } else {
        setUser(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    refreshTrips().catch(() => undefined)
  }, [refreshTrips])

  const signIn = async (email: string, password: string) => {
    setAuthError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setUser({ name: email.split("@")[0], email, avatar: "" })
      setActivePage("dashboard")
      return true
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      return false
    }
    setActivePage("dashboard")
    return true
  }

  const signUp = async (name: string, email: string, password: string) => {
    setAuthError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setUser({ name, email, avatar: "" })
      setActivePage("dashboard")
      return true
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) {
      setAuthError(error.message)
      return false
    }
    setActivePage("dashboard")
    return true
  }

  const signOut = async () => {
    await getBrowserSupabase()?.auth.signOut()
    setUser(null)
    setAccessToken(null)
    setActiveTrip(null)
    setActivePage("landing")
  }

  const resetPassword = async (email: string) => {
    const supabase = getBrowserSupabase()
    if (!supabase) return true
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) {
      setAuthError(error.message)
      return false
    }
    return true
  }

  const signInWithGoogle = async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setUser({ name: "Google User", email: "google@roamly.app", avatar: "" })
      setActivePage("dashboard")
      return
    }
    await supabase.auth.signInWithOAuth({ provider: "google" })
  }

  const toggleSaveItem = async (
    category: "hotels" | "flights" | "recs",
    id: SavedItemId,
    payload?: unknown,
    title?: string
  ) => {
    setSavedItems((prev) => {
      const items = [...prev[category]]
      if (items.includes(id)) return { ...prev, [category]: items.filter((x) => x !== id) }
      return { ...prev, [category]: [...items, id] }
    })
    if (supabaseEnabled && accessToken) {
      await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ category, externalId: id, payload, title }),
      })
    }
  }

  const runLivePlanning = async (reqs: TripRequirements) => {
    abortRef.current = false
    setIsDemoRunning(true)
    setActivePage("planning-process")
    setLogs([])
    setNegotiations([])
    setActiveTrip(null)
    try {
      const trip = await planTripStream(
        {
          from: reqs.from,
          to: reqs.to,
          destination: reqs.destination,
          startDate: reqs.startDate,
          endDate: reqs.endDate,
          travelers: reqs.travelers,
          budget: reqs.budget,
          currency: reqs.currency || currency,
          interests: reqs.interests,
          tripType: reqs.tripType,
          specialRequirements: reqs.specialRequirements,
          travelPace: reqs.travelPace,
          accommodation: reqs.accommodation,
          foodPreferences: reqs.foodPreferences,
        },
        accessToken,
        (event) => {
          if (abortRef.current) return
          if (event.type === "log") {
            setLogs((prev) => [...prev, toLog(event.event)])
            const neg = toNegotiation(event.event, Date.now())
            if (neg) {
              setNegotiations((prev) => [...prev, neg])
              if (neg.status === "REJECTED" || neg.status === "PROPOSED") {
                setActivePage((page) => (page === "planning-process" && neg.status === "REJECTED" ? "negotiations" : page))
              }
            }
          }
          if (event.type === "state") {
            setActiveTrip((prev) =>
              prev
                ? { ...prev, tripState: event.state, finalItinerary: event.state.finalItinerary ?? prev.finalItinerary }
                : prev
            )
          }
          if (event.type === "done") setActiveTrip(event.trip)
        }
      )
      if (trip) {
        setActiveTrip(trip)
        setTrips((prev) => [trip, ...prev.filter((t) => t.id !== trip.id)])
      }
      setIsDemoRunning(false)
      setActivePage("itinerary")
    } catch (error) {
      setIsDemoRunning(false)
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
          agent: "Supervisor",
          message: error instanceof Error ? error.message : "Planning failed",
          type: "error",
        },
      ])
    }
  }

  const runMockPlanning = () => {
    abortRef.current = false
    setIsDemoRunning(true)
    setActivePage("planning-process")
    setLogs([])
    setNegotiations([])
    let logIdx = 0
    const logInterval = window.setInterval(() => {
      if (abortRef.current) {
        window.clearInterval(logInterval)
        return
      }
      if (logIdx < mockAgentLogs.length) {
        setLogs((prev) => [...prev, mockAgentLogs[logIdx]])
        logIdx++
      } else {
        window.clearInterval(logInterval)
        window.setTimeout(() => {
          setActivePage("negotiations")
          let negIdx = 0
          const negInterval = window.setInterval(() => {
            if (abortRef.current) {
              window.clearInterval(negInterval)
              return
            }
            if (negIdx < mockNegotiations.length) {
              setNegotiations((prev) => [...prev, mockNegotiations[negIdx]])
              negIdx++
            } else {
              window.clearInterval(negInterval)
              window.setTimeout(() => {
                setIsDemoRunning(false)
                setActivePage("itinerary")
              }, 2500)
            }
          }, 1600)
        }, 800)
      }
    }, 800)
  }

  const startPlanning = (reqs: TripRequirements) => {
    if (providers.gemini) void runLivePlanning(reqs)
    else runMockPlanning()
  }

  const startDemo = () => {
    setRequirements(initialRequirements)
    startPlanning(initialRequirements)
  }

  const planTrip = () => startPlanning(requirements)

  const stopDemo = () => {
    abortRef.current = true
    setIsDemoRunning(false)
    if (!logs.length) setLogs(mockAgentLogs)
    if (!negotiations.length) setNegotiations(mockNegotiations)
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
        planTrip,
        stopDemo,
        theme,
        setTheme,
        currency,
        setCurrency,
        savedItems,
        setSavedItems,
        toggleSaveItem,
        providers,
        accessToken,
        activeTrip,
        setActiveTrip,
        trips,
        refreshTrips,
        supabaseEnabled,
        authError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within an AppProvider")
  return context
}
