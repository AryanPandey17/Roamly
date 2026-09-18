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
import { apiGet, apiSend, fetchStatus, planTripStream, type ProviderStatus } from "@/lib/api"
import { getBrowserSupabase, isBrowserSupabaseConfigured } from "@/lib/supabase/browser"
import type { AgentEvent, TripRecord } from "@/lib/types/trip"
import type { Session } from "@supabase/supabase-js"
import type { SavedPlace, SavedPlaceCategory, UserProfile } from "@/lib/types/persistence"

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

type SavedItemId = string
type AppUser = { id?: string; name: string; email: string; avatar: string }
type NotificationPreferences = {
  tripUpdates: boolean
  planningComplete: boolean
  budgetAlerts: boolean
}
type SavedItems = Record<SavedPlaceCategory, SavedItemId[]>

interface AppContextType {
  activePage: ActivePage
  setActivePage: (page: ActivePage) => void
  user: AppUser | null
  setUser: (user: AppUser | null) => void
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
  notifications: NotificationPreferences
  setNotifications: (notifications: NotificationPreferences) => void
  savedItems: SavedItems
  savedPlaces: SavedPlace[]
  toggleSaveItem: (
    category: SavedPlaceCategory,
    id: SavedItemId,
    payload?: unknown,
    title?: string
  ) => Promise<void>
  providers: ProviderStatus
  accessToken: string | null
  activeTrip: TripRecord | null
  setActiveTrip: (trip: TripRecord | null) => void
  trips: TripRecord[]
  refreshTrips: () => Promise<void>
  refreshSaved: () => Promise<void>
  profile: UserProfile | null
  updateProfile: (patch: Record<string, unknown>) => Promise<UserProfile | null>
  supabaseEnabled: boolean
  authError: string | null
  syncError: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const emptyProviders: ProviderStatus = {
  gemini: false,
  mistral: false,
  supabase: false,
  duffel: false,
  expedia: false,
  maps: false,
  activities: false,
  tavily: false,
}

const emptySavedItems: SavedItems = { hotels: [], flights: [], recs: [] }
const demoSavedItems: SavedItems = {
  hotels: ["hotel-1"],
  flights: ["flight-1"],
  recs: ["rec-1", "rec-2"],
}
const defaultNotifications: NotificationPreferences = {
  tripUpdates: true,
  planningComplete: true,
  budgetAlerts: true,
}

function userFromSession(session: Session): AppUser {
  return {
    id: session.user.id,
    name: (session.user.user_metadata?.full_name as string) || session.user.email?.split("@")[0] || "Traveler",
    email: session.user.email || "",
    avatar: "",
  }
}

function savedItemsFromPlaces(places: SavedPlace[]): SavedItems {
  return places.reduce<SavedItems>(
    (items, place) => ({ ...items, [place.category]: [...items[place.category], place.external_id] }),
    emptySavedItems
  )
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
  const supabaseEnabled = isBrowserSupabaseConfigured()
  const [activePage, setActivePage] = useState<ActivePage>("landing")
  const [user, setUser] = useState<AppUser | null>(null)
  const [requirements, setRequirements] = useState<TripRequirements>(initialRequirements)
  const [logs, setLogs] = useState<AgentActivityLog[]>([])
  const [negotiations, setNegotiations] = useState<NegotiationMessage[]>([])
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("light")
  const [currency, setCurrencyState] = useState("INR")
  const [notifications, setNotificationsState] = useState<NotificationPreferences>(defaultNotifications)
  const [savedItems, setSavedItems] = useState<SavedItems>(
    supabaseEnabled ? emptySavedItems : demoSavedItems
  )
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([])
  const [providers, setProviders] = useState<ProviderStatus>(emptyProviders)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null)
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const abortRef = useRef(false)

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

  const refreshSaved = useCallback(async () => {
    if (!supabaseEnabled || !accessToken) return
    const data = await apiGet<{ items: SavedPlace[] }>("/api/saved", accessToken)
    const items = data.items || []
    setSavedPlaces(items)
    setSavedItems(savedItemsFromPlaces(items))
  }, [accessToken, supabaseEnabled])

  const refreshProfile = useCallback(async () => {
    if (!supabaseEnabled || !accessToken) return
    const data = await apiGet<{ profile: UserProfile | null }>("/api/profile", accessToken)
    if (!data.profile) return
    const nextProfile = data.profile
    setProfile(nextProfile)
    if (nextProfile.full_name) {
      setUser((current) => (current ? { ...current, name: nextProfile.full_name! } : current))
    }
    if (nextProfile.theme === "light" || nextProfile.theme === "dark" || nextProfile.theme === "system") {
      setThemeState(nextProfile.theme)
    }
    if (nextProfile.currency) setCurrencyState(nextProfile.currency)
    if (nextProfile.notifications) {
      setNotificationsState({ ...defaultNotifications, ...nextProfile.notifications })
    }
  }, [accessToken, supabaseEnabled])

  const updateProfile = useCallback(
    async (patch: Record<string, unknown>): Promise<UserProfile | null> => {
      if (!supabaseEnabled || !accessToken) return null
      try {
        const data = await apiSend<{ profile: UserProfile }>("/api/profile", accessToken, "PUT", patch)
        if (!data.profile) throw new Error("Unable to save profile.")
        setProfile(data.profile)
        if (data.profile.full_name) {
          setUser((current) => (current ? { ...current, name: data.profile.full_name! } : current))
        }
        setSyncError(null)
        return data.profile
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Unable to save profile.")
        return null
      }
    },
    [accessToken, supabaseEnabled]
  )

  const setTheme = useCallback(
    (nextTheme: "light" | "dark" | "system") => {
      setThemeState(nextTheme)
      void updateProfile({ theme: nextTheme })
    },
    [updateProfile]
  )

  const setCurrency = useCallback(
    (nextCurrency: string) => {
      setCurrencyState(nextCurrency)
      void updateProfile({ currency: nextCurrency })
    },
    [updateProfile]
  )

  const setNotifications = useCallback(
    (nextNotifications: NotificationPreferences) => {
      setNotificationsState(nextNotifications)
      void updateProfile({ notifications: nextNotifications })
    },
    [updateProfile]
  )

  const applySession = useCallback((session: Session | null) => {
    setAccessToken(session?.access_token ?? null)
    setUser(session ? userFromSession(session) : null)
  }, [])

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) setSyncError(error.message)
        applySession(data.session)
      })
      .catch(() => setSyncError("Unable to restore your Supabase session."))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [applySession])

  useEffect(() => {
    if (!accessToken) {
      setTrips([])
      setSavedPlaces([])
      setSavedItems(supabaseEnabled ? emptySavedItems : demoSavedItems)
      setProfile(null)
      return
    }
    Promise.all([refreshTrips(), refreshSaved(), refreshProfile()]).catch((error) => {
      setSyncError(error instanceof Error ? error.message : "Unable to sync your account data.")
    })
  }, [accessToken, refreshProfile, refreshSaved, refreshTrips, supabaseEnabled])

  const signIn = async (email: string, password: string) => {
    setAuthError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setUser({ name: email.split("@")[0], email, avatar: "" })
      setActivePage("dashboard")
      return true
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      return false
    }
    applySession(data.session)
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) {
      setAuthError(error.message)
      return false
    }
    if (!data.session) {
      setAuthError("Check your email to confirm your account, then sign in to sync your trips.")
      return true
    }
    applySession(data.session)
    setActivePage("dashboard")
    return true
  }

  const signOut = async () => {
    await getBrowserSupabase()?.auth.signOut()
    applySession(null)
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
    category: SavedPlaceCategory,
    id: SavedItemId,
    payload?: unknown,
    title?: string
  ) => {
    const normalizedId = String(id)
    const previousItems = savedItems
    const isSaved = previousItems[category].includes(normalizedId)
    setSavedItems({
      ...previousItems,
      [category]: isSaved
        ? previousItems[category].filter((itemId) => itemId !== normalizedId)
        : [...previousItems[category], normalizedId],
    })
    if (!supabaseEnabled || !accessToken) return
    try {
      await apiSend<{ saved: boolean }>("/api/saved", accessToken, "POST", {
        category,
        externalId: normalizedId,
        payload,
        title,
      })
      await refreshSaved()
      setSyncError(null)
    } catch (error) {
      setSavedItems(previousItems)
      setSyncError(error instanceof Error ? error.message : "Unable to update saved places.")
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
        if (supabaseEnabled && accessToken) await refreshTrips()
      }
      setIsDemoRunning(false)
      setActivePage("itinerary")
    } catch (error) {
      setIsDemoRunning(false)
      setSyncError(error instanceof Error ? error.message : "Planning failed")
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
    // The deterministic graph is still fully functional without Gemini. Run it
    // for a signed-in Supabase user so a completed plan is actually persisted.
    if (providers.mistral || providers.gemini || (supabaseEnabled && Boolean(accessToken))) void runLivePlanning(reqs)
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
        notifications,
        setNotifications,
        savedItems,
        savedPlaces,
        toggleSaveItem,
        providers,
        accessToken,
        activeTrip,
        setActiveTrip,
        trips,
        refreshTrips,
        refreshSaved,
        profile,
        updateProfile,
        supabaseEnabled,
        authError,
        syncError,
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
